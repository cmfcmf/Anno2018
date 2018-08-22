/**
 * This code is based on the bin-packing library by Jake Gordon licensed under MIT license.
 *
 * https://github.com/jakesgordon/bin-packing/blob/master/js/packer.js
 */

/******************************************************************************
 This is a very simple binary tree based bin packing algorithm that is initialized
 with a fixed width and height and will fit each block into the first node where
 it fits and then split that node into 2 parts (down and right) to track the
 remaining whitespace.
 Best results occur when the input blocks are sorted by height, or even better
 when sorted by max(width,height).
 Inputs:
 ------
 w:       width of target rectangle
 h:      height of target rectangle
 blocks: array of any objects that have .w and .h attributes
 Outputs:
 -------
 marks each block that fits with a .fit attribute pointing to a
 node with .x and .y coordinates
 Example:
 -------
 var blocks = [
 { w: 100, h: 100 },
 { w: 100, h: 100 },
 { w:  80, h:  80 },
 { w:  80, h:  80 },
 etc
 etc
 ];
 var packer = new Packer(500, 500);
 packer.fit(blocks);
 for(var n = 0 ; n < blocks.length ; n++) {
    var block = blocks[n];
    if (block.fit) {
      Draw(block.fit.x, block.fit.y, block.w, block.h);
    }
  }
 ******************************************************************************/

interface Rect {
  w: number;
  h: number;
  fit?: Node;
}

interface Node {
  x: number;
  y: number;
  w: number;
  h: number;
  used?: boolean;
  down?: Node;
  right?: Node;
}

export default class BinPacker {
  private readonly root: Node;

  constructor(w: number, h: number) {
    this.root = { x: 0, y: 0, w: w, h: h };
  }

  public addBlock(block: Rect) {
    const node = this.findNode(this.root, block.w, block.h);
    if (node) {
      return this.splitNode(node, block.w, block.h);
    } else {
      return false;
    }
  }

  private findNode(root: Node, w: number, h: number): Node | null {
    if (root.used) {
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    } else if (w <= root.w && h <= root.h) {
      return root;
    } else {
      return null;
    }
  }

  private splitNode(node: Node, w: number, h: number) {
    node.used = true;
    node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
    node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
    return node;
  }
}
