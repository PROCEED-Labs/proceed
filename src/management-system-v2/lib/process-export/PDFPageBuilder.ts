import { jsPDF } from 'jspdf';

type ContentPosition = 'left' | 'right' | 'center';

interface ContentInfo {
  position: ContentPosition; // how the element should be aligned on the page
  size: { width: number; height: number };
  margins: { left: number; right: number; top: number; bottom: number };
}

interface TextContentInfo extends ContentInfo {
  text: string;
}

interface ImageContentInfo extends ContentInfo {
  svg: string;
}

type PageContentInfo = TextContentInfo | ImageContentInfo;

/**
 * Helper class that simplifies the creation of the pdfs for processes
 */
class PDFPageBuilder {
  private pdf: jsPDF;
  // the page size WITHOUT! page margins
  private size?: { width: number; height: number };
  // the margins of the page
  private margins: { left: number; right: number; top: number; bottom: number };
  // the different pieces of text and images to put on the page
  private pageContent: PageContentInfo[];

  /**
   * Create a new page builder
   *
   * @param pdf the pdf to which the new page shall be added
   * @param a4Format if the page should have an a4 Format or if it should be scaled to fit the content
   * @param margins the margins of the page
   */
  constructor(pdf: jsPDF, a4Format = false, margins = { left: 5, right: 5, top: 5, bottom: 5 }) {
    if (a4Format) {
      // get the size of an a4 page and safe the amount of space available for the content
      const page = pdf.addPage('a4', 'l');
      this.size = {
        width: page.internal.pageSize.width - margins.left - margins.right,
        height: page.internal.pageSize.height - margins.top - margins.bottom,
      };

      // remove the intermediate page
      pdf.deletePage(pdf.getNumberOfPages());
    }

    this.margins = margins;
    this.pdf = pdf;
    this.pageContent = [];
  }

  /**
   * Returns the width of a line with bold and non-bold text
   *
   * @param text the text to get the line width for (you can define bold text the following way: normal**bold**normal)
   * @returns the width of the string (based on the font size used in the pdf)
   */
  private getLineDimensions(text: string) {
    const { pdf } = this;

    const { fontName } = pdf.getFont();

    let lineWidth = 0;
    // text enclosed in **[text]** is supposed to be bold
    const splitText = text.split('**');

    splitText.forEach((substring, index) => {
      const isBold = index % 2 !== 0;

      // we need to set the font to bold to get the correct text size for our bold parts
      if (isBold) pdf.setFont(fontName, 'bold');
      lineWidth += pdf.getStringUnitWidth(substring) * pdf.getFontSize();
      if (isBold) pdf.setFont(fontName, 'normal');
    });

    return { width: lineWidth, height: pdf.getLineHeight() };
  }

  /**
   * Returns the dimensions of a vector-image
   *
   * @param svg the svg string to get the size from
   * @returns the width and height of the image
   */
  private getImageDimensions(svg: string) {
    let width = 0;
    let height = 0;

    const viewBox = svg.split('<svg')[1].split('>')[0].split('viewBox="');

    if (viewBox) {
      [width, height] = viewBox[1].split('"')[0].split(' ').map(parseFloat).slice(2);
    } else {
      width = parseFloat(svg.split('width="')[1].split('"')[0]);
      height = parseFloat(svg.split('height="')[1].split('"')[0]);
    }

    return {
      width,
      height,
    };
  }

  /**
   * Add a vector-image to the page
   *
   * @param svg the svg image
   * @param position if the image should be positioned on the left, right or center of the page
   * @param size the size of the image on the page
   * @param margins the empty space that should be on each side of an element to force a distance to the page border or other elements
   */
  async addVectorImage(
    svg: string,
    position: ContentPosition = 'left',
    size?: { width: number; height: number },
    margins: { left?: number; right?: number; top?: number; bottom?: number } = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  ) {
    // make sure to have default margins
    const finalMargins = {
      left: margins.left || 0,
      right: margins.right || 0,
      top: margins.top || 0,
      bottom: margins.bottom || 0,
    };

    const imageDimensions = this.getImageDimensions(svg);

    // if the image is too small dont scale it up but place it in the middle of the space to occupy
    if (size && imageDimensions.width < size.width && imageDimensions.height < size.height) {
      const wDiff = size.width - imageDimensions.width;
      const hDiff = size.height - imageDimensions.height;

      finalMargins.left += wDiff / 2;
      finalMargins.right += wDiff / 2;
      finalMargins.top += hDiff / 2;
      finalMargins.bottom += hDiff / 2;

      size = imageDimensions;
    }

    this.pageContent.push({
      svg,
      position,
      size: size || imageDimensions,
      margins: finalMargins,
    });
  }

  /**
   * Add a line of text to the page (you can define bold text the following way: normal**bold**normal)
   *
   * @param text
   * @param position if the image should be positioned on the left, right or center of the page
   * @param margins the empty space that should be on each side of an element to force a distance to the page border or other elements
   */
  addLine(
    text: string,
    position: ContentPosition = 'left',
    margins: { left?: number; right?: number; top?: number; bottom?: number } = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  ) {
    // make sure to have default margins
    const finalMargins = {
      left: margins.left || 0,
      right: margins.right || 0,
      top: margins.top || 0,
      bottom: margins.bottom || 0,
    };

    this.pageContent.push({
      text,
      position,
      size: this.getLineDimensions(text),
      margins: finalMargins,
    });
  }

  /**
   * Returns the space that is needed to display the content that was added up to this point
   *
   * @returns the width and height of the current content
   */
  private getContentSize() {
    const size = { width: 0, height: 0 };

    this.pageContent.forEach((content) => {
      // since we don't allow elements to be placed next to each other the needed width is that of the widest element
      size.width = Math.max(
        size.width,
        content.size.width + content.margins.left + content.margins.right,
      );
      size.height += content.size.height + content.margins.top + content.margins.bottom;
    });

    if (!this.size) this.size = size;

    return size;
  }

  /**
   * Returns the amount of space that can still be assigned to additional content
   *
   * @returns the width and height that additional content may occupy
   */
  getRemainingSize() {
    // if we have no restriction set on the content size content of any size may be added
    if (!this.size) return { width: Infinity, height: Infinity };
    else {
      const currentContentSize = this.getContentSize();

      return {
        width: this.size.width,
        height: this.size.height - currentContentSize.height,
      };
    }
  }

  /**
   * Returns the size of the final pdf page
   *
   * @returns the width and height of the final pdf page
   */
  private getPageSize() {
    const contentSize = this.size ? this.size : this.getContentSize();

    return {
      width: contentSize.width + this.margins.left + this.margins.right,
      height: contentSize.height + this.margins.top + this.margins.top,
    };
  }

  /**
   * Calculates the horizontal position at which to start drawing the content
   *
   * @param page the page to draw to
   * @param position if the content should be aligned on the left, right or center of the page
   * @param width the width of the content
   * @param margins the margins of the content
   * @returns the horizontal position at which to start drawing the content
   */
  private getHorizontalStartingPosition(
    page: jsPDF,
    position: ContentPosition,
    width: number,
    margins: ContentInfo['margins'],
  ) {
    switch (position) {
      case 'left':
        return this.margins.left + margins.left;
      case 'right':
        return page.internal.pageSize.width - this.margins.right - margins.right - width;
      case 'center':
        return this.margins.left + this.size!.width / 2 - width / 2;
    }
  }

  /**
   * Draw a line of text onto the pdf page
   *
   * @param page the page to add the text to
   * @param textContent the text to add and meta information like its margin and position
   * @param yPosition the offset to the top of the page at which to start drawing the line
   * @returns the first y position at which new content may be added below the line
   */
  private drawLine(page: jsPDF, textContent: TextContentInfo, yPosition: number) {
    const { text } = textContent;

    yPosition += textContent.margins.top;

    let xPosition = this.getHorizontalStartingPosition(
      page,
      textContent.position,
      textContent.size.width,
      textContent.margins,
    );

    // we allow bold text to be defined like this '[normal]**[bold]**[normal]'
    const splitText = text.split('**');
    const { fontName } = page.getFont();
    // draw the line
    splitText.forEach((substring, index) => {
      const isBold = index % 2 !== 0;

      if (isBold) page.setFont(fontName, 'bold');
      page.text(substring, xPosition, yPosition);
      xPosition += this.getLineDimensions(substring).width;
      if (isBold) page.setFont(fontName, 'normal');
    });

    // return the position of a potential following element below the newly drawn line
    return yPosition + page.getLineHeight() + textContent.margins.bottom;
  }

  /**
   * Draw a vector-image onto the pdf page
   *
   * @param page the page to add the image to
   * @param image the svg to add and meta information like its margin and position
   * @param yPosition the offset to the top of the page at which to start drawing the image
   * @returns the first y position at which new content may be added below the image
   */
  private async drawVectorImage(page: jsPDF, imageContent: ImageContentInfo, yPosition: number) {
    yPosition += imageContent.margins.top;

    let xPosition = this.getHorizontalStartingPosition(
      page,
      imageContent.position,
      imageContent.size.width,
      imageContent.margins,
    );

    // draw the image
    const parser = new DOMParser();
    let svgDOM = parser.parseFromString(imageContent.svg, 'image/svg+xml');

    await page.svg(svgDOM.children[0], {
      x: xPosition,
      y: yPosition,
      ...imageContent.size,
    });

    // return the potential position of a potential following element below the newly drawn image
    return yPosition + imageContent.size.height + imageContent.margins.bottom;
  }

  /**
   * Creates a new page in the pdf given to the builder using the previously registered content
   */
  async createPage() {
    // create the new page with the correct size
    let size = this.getPageSize();
    const page = this.pdf.addPage([size.width, size.height], size.height > size.width ? 'p' : 'l');

    // get the vertical starting position for new elements
    let currentYPosition = this.margins.top;

    // sequentially add all the registered elements to the page
    for (const content of this.pageContent) {
      if ('text' in content) {
        currentYPosition = this.drawLine(page, content, currentYPosition);
      } else if ('svg' in content) {
        currentYPosition = await this.drawVectorImage(page, content, currentYPosition);
      }
    }
  }
}

export default PDFPageBuilder;
