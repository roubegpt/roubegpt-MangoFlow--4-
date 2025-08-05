import puppeteer, { Browser, Page } from 'puppeteer';
import { ChromeSettings } from '@shared/schema';

export interface ScrapedProduct {
  name: string;
  imageUrl: string;
  productUrl: string;
  category: string;
  price?: string;
}

export class ChromeAutomationService {
  private browser: Browser | null = null;
  private isRunning = false;

  async initialize(settings: ChromeSettings): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await puppeteer.launch({
      headless: settings.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async testConnection(settings: ChromeSettings): Promise<{ success: boolean; message: string }> {
    try {
      await this.initialize(settings);
      const page = await this.browser!.newPage();
      
      await page.goto(settings.url, { waitUntil: 'networkidle2', timeout: 10000 });
      const title = await page.title();
      
      await page.close();
      
      return {
        success: true,
        message: `연결 성공: ${title}`
      };
    } catch (error) {
      return {
        success: false,
        message: `연결 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  async scrapeProducts(
    settings: ChromeSettings,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ScrapedProduct[]> {
    if (!this.browser) {
      await this.initialize(settings);
    }

    this.isRunning = true;
    const products: ScrapedProduct[] = [];
    
    try {
      const page = await this.browser!.newPage();
      
      // 모바일 에이전트로 설정하여 더 빠른 로딩
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15');
      
      onProgress?.(10, '망고몰 접속 중...');
      await page.goto(settings.url, { waitUntil: 'networkidle2' });
      
      onProgress?.(20, '카테고리 페이지 탐색 중...');
      
      // 카테고리별 상품 페이지 찾기
      const categoryUrls = await this.findCategoryUrls(page, settings.category);
      
      let totalScraped = 0;
      const maxProducts = settings.limit;
      
      for (const categoryUrl of categoryUrls) {
        if (totalScraped >= maxProducts || !this.isRunning) break;
        
        onProgress?.(
          20 + (totalScraped / maxProducts) * 60,
          `${settings.category} 카테고리 수집 중... (${totalScraped}/${maxProducts})`
        );
        
        await page.goto(categoryUrl, { waitUntil: 'networkidle2' });
        await this.autoScroll(page);
        
        const categoryProducts = await this.extractProductsFromPage(page, settings.category);
        
        for (const product of categoryProducts) {
          if (totalScraped >= maxProducts) break;
          products.push(product);
          totalScraped++;
          
          // 요청 간 딜레이
          await new Promise(resolve => setTimeout(resolve, settings.delay));
        }
      }
      
      onProgress?.(90, '수집 완료 중...');
      await page.close();
      
      onProgress?.(100, `총 ${products.length}개 상품 수집 완료`);
      
    } catch (error) {
      throw new Error(`크롤링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      this.isRunning = false;
    }
    
    return products;
  }

  async loginToMango(page: Page, username: string, password: string): Promise<boolean> {
    try {
      // 더망고 관리자 로그인 페이지로 이동
      const loginUrl = process.env.THEMANGO_LOGIN_URL || 'https://tmg1202.cafe24.com/mall/admin/admin_login.php';
      await page.goto(loginUrl, { waitUntil: 'networkidle2' });

      // 로그인 폼 입력
      await page.waitForSelector('input[name="userid"], #userid, input[type="text"]', { timeout: 5000 });
      await page.type('input[name="userid"], #userid, input[type="text"]', username);
      
      await page.waitForSelector('input[name="passwd"], #passwd, input[type="password"]', { timeout: 5000 });
      await page.type('input[name="passwd"], #passwd, input[type="password"]', password);

      // 로그인 버튼 클릭
      await page.click('input[type="submit"], button[type="submit"], .login-btn');
      
      // 로그인 성공 확인
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('error');
      
      if (isLoggedIn) {
        console.log('[INFO] 더망고 관리자 로그인 성공');
        return true;
      } else {
        console.error('[ERROR] 더망고 로그인 실패');
        return false;
      }
    } catch (error) {
      console.error('[ERROR] 더망고 로그인 중 오류:', error);
      return false;
    }
  }

  async extractThumbnailsByFilter(
    page: Page, 
    filterName: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ScrapedProduct[]> {
    try {
      onProgress?.(10, `필터 "${filterName}" 적용 중...`);
      
      // 상품 관리 페이지로 이동
      const productManagementUrl = 'https://tmg1202.cafe24.com/mall/admin/product_list.php';
      await page.goto(productManagementUrl, { waitUntil: 'networkidle2' });

      onProgress?.(30, '상품 목록 로딩 중...');

      // 필터 적용 (카테고리, 브랜드, 상태 등)
      await this.applyFilter(page, filterName);
      
      onProgress?.(50, '썸네일 이미지 추출 중...');

      // 상품 목록에서 썸네일 추출
      const products = await this.extractProductThumbnails(page, filterName);
      
      onProgress?.(100, `필터 "${filterName}"에서 ${products.length}개 썸네일 추출 완료`);
      
      return products;
    } catch (error) {
      throw new Error(`필터 "${filterName}" 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async applyFilter(page: Page, filterName: string): Promise<void> {
    // 필터 옵션에 따른 처리
    const filterMap: Record<string, string> = {
      '신상품': 'new',
      '베스트': 'best',
      '세일': 'sale',
      '여성의류': 'women',
      '남성의류': 'men',
      '액세서리': 'accessories',
      '전체': 'all'
    };

    const filterValue = filterMap[filterName] || 'all';
    
    try {
      // 카테고리 선택
      const categorySelector = `select[name="category"], #category, .category-select`;
      const categoryExists = await page.$(categorySelector);
      
      if (categoryExists) {
        await page.select(categorySelector, filterValue);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 검색 버튼 클릭
      const searchButton = await page.$('input[type="submit"][value*="검색"], .search-btn, #search-btn');
      if (searchButton) {
        await searchButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.warn(`필터 적용 중 경고:`, error);
    }
  }

  private async extractProductThumbnails(page: Page, category: string): Promise<ScrapedProduct[]> {
    return await page.evaluate((cat) => {
      const products: any[] = [];
      
      // 더망고 관리자 페이지의 상품 목록 선택자
      const productRows = document.querySelectorAll('tr[data-product], .product-row, tbody tr');
      
      productRows.forEach((row, index) => {
        try {
          // 썸네일 이미지 추출
          const imgElement = row.querySelector('img') as HTMLImageElement;
          const nameElement = row.querySelector('td:nth-child(3), .product-name, .prd-name');
          const codeElement = row.querySelector('.product-code, .prd-code');
          
          if (imgElement && nameElement) {
            const name = nameElement.textContent?.trim() || `상품_${index + 1}`;
            const imageUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            const productCode = codeElement?.textContent?.trim() || '';
            
            if (imageUrl && !imageUrl.includes('no-image')) {
              products.push({
                name,
                imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://tmg1202.cafe24.com${imageUrl}`,
                productUrl: '',
                category: cat,
                productCode
              });
            }
          }
        } catch (error) {
          console.warn('썸네일 추출 중 오류:', error);
        }
      });
      
      return products;
    }, category);
  }

  private async findCategoryUrls(page: Page, category: string): Promise<string[]> {
    // 더망고 쇼핑몰의 카테고리 구조에 맞게 URL 생성
    const categoryMap: Record<string, string[]> = {
      '여성의류': [
        'https://tmg1202.cafe24.com/category/women-clothes',
        'https://tmg1202.cafe24.com/category/dress',
        'https://tmg1202.cafe24.com/category/top'
      ],
      '남성의류': [
        'https://tmg1202.cafe24.com/category/men-clothes',
        'https://tmg1202.cafe24.com/category/shirt',
        'https://tmg1202.cafe24.com/category/t-shirt'
      ],
      '액세서리': [
        'https://tmg1202.cafe24.com/category/accessories',
        'https://tmg1202.cafe24.com/category/bag'
      ],
      '전체': [
        'https://tmg1202.cafe24.com/product/list.html'
      ]
    };

    return categoryMap[category] || categoryMap['전체'];
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private async extractProductsFromPage(page: Page, category: string): Promise<ScrapedProduct[]> {
    return await page.evaluate((cat) => {
      const products: ScrapedProduct[] = [];
      
      // 망고 웹사이트의 상품 선택자 (실제 구조에 맞게 조정 필요)
      const productElements = document.querySelectorAll('[data-testid="product-grid-item"], .product-item, .item-product');
      
      productElements.forEach((element) => {
        try {
          const nameElement = element.querySelector('h2, .product-name, [data-testid="product-name"]');
          const imageElement = element.querySelector('img');
          const linkElement = element.querySelector('a');
          const priceElement = element.querySelector('.price, [data-testid="price"]');
          
          if (nameElement && imageElement && linkElement) {
            const name = nameElement.textContent?.trim() || '';
            const imageUrl = imageElement.src || imageElement.getAttribute('data-src') || '';
            const productUrl = linkElement.href || '';
            const price = priceElement?.textContent?.trim() || '';
            
            if (name && imageUrl && productUrl) {
              products.push({
                name,
                imageUrl,
                productUrl,
                category: cat,
                price
              });
            }
          }
        } catch (error) {
          console.warn('상품 추출 중 오류:', error);
        }
      });
      
      return products;
    }, category);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}

export const chromeAutomationService = new ChromeAutomationService();
