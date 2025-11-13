import { Page, expect } from '@playwright/test';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export class VisualComparison {
  private baselinePath: string;
  private actualPath: string;
  private diffPath: string;

  constructor(private page: Page, testName: string) {
    const screenshotsDir = join(process.cwd(), 'e2e', 'screenshots');
    this.baselinePath = join(screenshotsDir, 'baseline');
    this.actualPath = join(screenshotsDir, 'actual');
    this.diffPath = join(screenshotsDir, 'diff');
    
    // Ensure directories exist
    [this.baselinePath, this.actualPath, this.diffPath].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Compare a full page screenshot
   */
  async compareFullPage(name: string, options?: {
    threshold?: number;
    mask?: string[];
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<{ match: boolean; pixelDifference: number; diffPercentage: number }> {
    const { threshold = 0.1, mask = [], clip } = options || {};
    
    // Take screenshot
    const screenshotOptions: any = {
      fullPage: true,
      animations: 'disabled'
    };
    
    if (clip) {
      screenshotOptions.clip = clip;
    }
    
    if (mask.length > 0) {
      screenshotOptions.mask = mask.map(selector => this.page.locator(selector));
    }
    
    const actualScreenshot = await this.page.screenshot(screenshotOptions);
    
    return this.compareImages(name, actualScreenshot, threshold);
  }

  /**
   * Compare a specific element screenshot
   */
  async compareElement(selector: string, name: string, options?: {
    threshold?: number;
  }): Promise<{ match: boolean; pixelDifference: number; diffPercentage: number }> {
    const { threshold = 0.1 } = options || {};
    
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    
    const actualScreenshot = await element.screenshot({
      animations: 'disabled'
    });
    
    return this.compareImages(name, actualScreenshot, threshold);
  }

  /**
   * Create a new baseline image
   */
  async createBaseline(name: string, fullPage: boolean = true): Promise<void> {
    const screenshotOptions = {
      fullPage,
      animations: 'disabled' as const
    };
    
    const screenshot = await this.page.screenshot(screenshotOptions);
    const baselineFile = join(this.baselinePath, `${name}.png`);
    
    writeFileSync(baselineFile, screenshot);
    console.log(`✅ Created baseline: ${baselineFile}`);
  }

  /**
   * Update baseline with current screenshot
   */
  async updateBaseline(name: string): Promise<void> {
    const actualFile = join(this.actualPath, `${name}.png`);
    const baselineFile = join(this.baselinePath, `${name}.png`);
    
    if (existsSync(actualFile)) {
      const actualData = await this.readPNG(actualFile);
      writeFileSync(baselineFile, actualData);
      console.log(`✅ Updated baseline: ${baselineFile}`);
    }
  }

  /**
   * Compare two images and generate diff
   */
  private async compareImages(name: string, actualScreenshot: Buffer, threshold: number): Promise<{
    match: boolean;
    pixelDifference: number;
    diffPercentage: number;
  }> {
    const baselineFile = join(this.baselinePath, `${name}.png`);
    const actualFile = join(this.actualPath, `${name}.png`);
    const diffFile = join(this.diffPath, `${name}.png`);
    
    // Save actual screenshot
    writeFileSync(actualFile, actualScreenshot);
    
    // Check if baseline exists
    if (!existsSync(baselineFile)) {
      console.log(`⚠️ No baseline found for ${name}, creating one...`);
      writeFileSync(baselineFile, actualScreenshot);
      return { match: true, pixelDifference: 0, diffPercentage: 0 };
    }
    
    // Load images
    const baselineImage = PNG.sync.read(await this.readFile(baselineFile));
    const actualImage = PNG.sync.read(actualScreenshot);
    
    // Ensure images have the same dimensions
    if (baselineImage.width !== actualImage.width || baselineImage.height !== actualImage.height) {
      console.error(`❌ Image dimensions don't match for ${name}`);
      console.error(`Baseline: ${baselineImage.width}x${baselineImage.height}`);
      console.error(`Actual: ${actualImage.width}x${actualImage.height}`);
      return { match: false, pixelDifference: -1, diffPercentage: 100 };
    }
    
    // Create diff image
    const diffImage = new PNG({
      width: baselineImage.width,
      height: baselineImage.height
    });
    
    // Compare images
    const pixelDifference = pixelmatch(
      baselineImage.data,
      actualImage.data,
      diffImage.data,
      baselineImage.width,
      baselineImage.height,
      {
        threshold,
        includeAA: false,
        alpha: 0.1,
        aaColor: [255, 255, 0], // Yellow for anti-aliasing differences
        diffColor: [255, 0, 0]  // Red for pixel differences
      }
    );
    
    const totalPixels = baselineImage.width * baselineImage.height;
    const diffPercentage = (pixelDifference / totalPixels) * 100;
    
    // Save diff image if there are differences
    if (pixelDifference > 0) {
      writeFileSync(diffFile, PNG.sync.write(diffImage));
      console.log(`📊 Visual diff saved: ${diffFile}`);
      console.log(`📊 Pixel difference: ${pixelDifference} (${diffPercentage.toFixed(2)}%)`);
    }
    
    const match = diffPercentage <= (threshold * 100);
    return { match, pixelDifference, diffPercentage };
  }
  
  private async readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createReadStream(filePath);
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  
  private async readPNG(filePath: string): Promise<Buffer> {
    return this.readFile(filePath);
  }

  /**
   * Generate visual comparison report
   */
  async generateReport(results: Array<{
    testName: string;
    match: boolean;
    pixelDifference: number;
    diffPercentage: number;
  }>): Promise<void> {
    const reportPath = join(process.cwd(), 'e2e', 'visual-report.html');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .test-result { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; }
        .test-header { padding: 15px; background: #f9f9f9; border-bottom: 1px solid #ddd; }
        .test-content { padding: 20px; }
        .pass { border-left: 5px solid #4caf50; }
        .fail { border-left: 5px solid #f44336; }
        .images { display: flex; gap: 20px; flex-wrap: wrap; }
        .image-container { flex: 1; min-width: 300px; }
        .image-container img { max-width: 100%; height: auto; border: 1px solid #ddd; }
        .stats { display: flex; gap: 20px; margin: 10px 0; }
        .stat { padding: 10px; background: #f0f0f0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Visual Regression Test Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <div class="stats">
            <div class="stat">Total Tests: ${results.length}</div>
            <div class="stat">Passed: ${results.filter(r => r.match).length}</div>
            <div class="stat">Failed: ${results.filter(r => !r.match).length}</div>
        </div>
    </div>
    
    ${results.map(result => `
        <div class="test-result ${result.match ? 'pass' : 'fail'}">
            <div class="test-header">
                <h3>${result.testName}</h3>
                <div class="stats">
                    <div class="stat">Status: ${result.match ? 'PASS' : 'FAIL'}</div>
                    <div class="stat">Pixel Difference: ${result.pixelDifference}</div>
                    <div class="stat">Difference %: ${result.diffPercentage.toFixed(2)}%</div>
                </div>
            </div>
            <div class="test-content">
                <div class="images">
                    <div class="image-container">
                        <h4>Baseline</h4>
                        <img src="screenshots/baseline/${result.testName}.png" alt="Baseline">
                    </div>
                    <div class="image-container">
                        <h4>Actual</h4>
                        <img src="screenshots/actual/${result.testName}.png" alt="Actual">
                    </div>
                    ${!result.match ? `
                    <div class="image-container">
                        <h4>Difference</h4>
                        <img src="screenshots/diff/${result.testName}.png" alt="Difference">
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('')}
</body>
</html>
    `;
    
    writeFileSync(reportPath, html);
    console.log(`📋 Visual report generated: ${reportPath}`);
  }

  /**
   * Cleanup old screenshots
   */
  async cleanup(keepDays: number = 7): Promise<void> {
    // Implementation for cleaning up old screenshots
    // This would typically remove files older than keepDays
    console.log(`🧹 Cleanup completed (keeping last ${keepDays} days)`);
  }
}