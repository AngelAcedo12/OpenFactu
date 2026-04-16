import Handlebars from 'handlebars';
import puppeteer, { Browser, PaperFormat } from 'puppeteer';
import crypto from 'crypto';
import { DocumentPdfPayload } from './types';
import type { VisualOptions, PageSize, MarginPreset } from './visualOptionsSchema';

type CompiledTemplate = HandlebarsTemplateDelegate<any>;

export interface RenderOptions {
  pageSize?: PageSize;
  orientation?: 'portrait' | 'landscape';
  margins?: MarginPreset;
  showPageNumbers?: boolean;
  footerAlignment?: 'left' | 'center' | 'right';
}

const MARGIN_MM: Record<
  MarginPreset,
  { top: string; right: string; bottom: string; left: string }
> = {
  narrow: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  normal: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' },
  wide: { top: '28mm', right: '24mm', bottom: '28mm', left: '24mm' },
};

/**
 * Singleton service que renderiza HTML + Handlebars a PDF usando Puppeteer.
 * Reutiliza una instancia única de Browser y cachea las plantillas compiladas.
 */
export class PdfRenderer {
  private static browser: Browser | null = null;
  private static browserPromise: Promise<Browser> | null = null;
  private static templateCache: Map<string, CompiledTemplate> = new Map();
  private static helpersRegistered = false;

  private static registerHelpers() {
    if (this.helpersRegistered) return;

    Handlebars.registerHelper('formatCurrency', (value: any) => {
      const n = Number(value) || 0;
      return new Handlebars.SafeString(
        n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
      );
    });

    Handlebars.registerHelper('formatNumber', (value: any, decimals: number) => {
      const n = Number(value) || 0;
      const d = typeof decimals === 'number' ? decimals : 2;
      return n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
    });

    Handlebars.registerHelper('formatDate', (value: any) => {
      if (!value) return '';
      const d = value instanceof Date ? value : new Date(value);
      return d.toLocaleDateString('es-ES');
    });

    Handlebars.registerHelper('padLeft', (value: any, length: number, char: string) => {
      const str = String(value ?? '');
      return str.padStart(length, char ?? '0');
    });

    Handlebars.registerHelper('multiply', (a: any, b: any) => {
      return (Number(a) || 0) * (Number(b) || 0);
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('gt', (a: any, b: any) => Number(a) > Number(b));

    this.helpersRegistered = true;
  }

  private static async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    if (this.browserPromise) return this.browserPromise;

    this.browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    this.browser = await this.browserPromise;
    this.browserPromise = null;
    return this.browser;
  }

  private static compile(html: string): CompiledTemplate {
    const hash = crypto.createHash('sha1').update(html).digest('hex');
    let compiled = this.templateCache.get(hash);
    if (!compiled) {
      compiled = Handlebars.compile(html, { noEscape: false });
      this.templateCache.set(hash, compiled);
      if (this.templateCache.size > 50) {
        const firstKey = this.templateCache.keys().next().value;
        if (firstKey) this.templateCache.delete(firstKey);
      }
    }
    return compiled;
  }

  public static invalidateCache() {
    this.templateCache.clear();
  }

  private static buildFooterTemplate(alignment: string): string {
    const align =
      alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center';
    return `<div style="font-size:8pt; color:#94a3b8; width:100%; padding:0 15mm; display:flex; justify-content:${align}; font-family:-apple-system,sans-serif;">
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;
  }

  /**
   * Renderiza el HTML+Handlebars con los datos del documento y devuelve el Buffer del PDF.
   */
  public static async render(
    templateHtml: string,
    data: DocumentPdfPayload,
    options: RenderOptions = {},
  ): Promise<Buffer> {
    this.registerHelpers();
    const compiled = this.compile(templateHtml);
    const renderedHtml = compiled(data);

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });

      const margin = options.margins ? MARGIN_MM[options.margins] : MARGIN_MM.normal;
      const displayHeaderFooter = !!options.showPageNumbers;

      const buffer = await page.pdf({
        format: (options.pageSize || 'A4') as PaperFormat,
        landscape: options.orientation === 'landscape',
        printBackground: true,
        margin,
        displayHeaderFooter,
        headerTemplate: displayHeaderFooter ? '<span></span>' : undefined,
        footerTemplate: displayHeaderFooter
          ? this.buildFooterTemplate(options.footerAlignment || 'center')
          : undefined,
        preferCSSPageSize: true,
      });
      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Construye RenderOptions a partir de unas VisualOptions parseadas del meta del HTML.
   */
  public static renderOptionsFromVisual(opts: VisualOptions): RenderOptions {
    return {
      pageSize: opts.pageSize,
      orientation: opts.orientation,
      margins: opts.margins,
      showPageNumbers: opts.footer.showPageNumbers,
      footerAlignment: opts.footer.alignment,
    };
  }

  public static async shutdown() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        /* ignore */
      }
      this.browser = null;
    }
  }
}
