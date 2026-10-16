// The spacing of a post article comes from two numbers, and everything else follows them.
//
// BLOCK_GAP is the one margin a block opens with (and closes with none), so the gap
// between any two blocks is this value, whatever they are.
//
// TEXT_SPACE is the empty space above and below a line of text inside its own box:
// (line-height - font-size) / 2. Text gets it by taking its line height from
// lineHeightFor, so it is the same for every font size and nobody has to work out a
// line height by hand. It comes on top of BLOCK_GAP, so the letters of two neighbouring
// lines end up BLOCK_GAP + 2 * TEXT_SPACE apart.
export const BLOCK_GAP = 20;
export const TEXT_SPACE = 4.5;

export const lineHeightFor = (fontSize) => fontSize + 2 * TEXT_SPACE;

// The margin shorthand every block uses: the gap above, nothing at the sides or below.
export const BLOCK_MARGIN = `${BLOCK_GAP}px 0 0`;
