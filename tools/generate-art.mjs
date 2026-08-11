/**
 * NØVA placeholder art generator.
 *
 * Every image in the storefront is generated here as an SVG so the demo ships
 * with a coherent visual identity instead of mismatched stock photography.
 * Two families:
 *
 *   1. Garment renders — technical flat-lay illustrations on a transparent
 *      ground, so the same file reads correctly on the white MINIMAL sections
 *      and on the black STREET/LIMITED sections.
 *   2. Campaign plates — abstract editorial compositions, each stamped with a
 *      bracketed label ([STREETWEAR CAMPAIGN]) so nobody mistakes a placeholder
 *      for a final asset.
 *
 * Replacing art later means swapping the file in assets/ or, better,
 * pointing the product at a real Shopify image — nothing here is load-bearing.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets');
if (!existsSync(out)) mkdirSync(out, { recursive: true });

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/**
 * `edge` is the outline drawn around the finished garment. The storefront runs
 * on a white canvas, so pale colorways need a DARK edge to separate from the
 * page, while dark colorways need a light rim to stay legible against the
 * inverted campaign blocks. `shadow` compensates for the same problem below.
 */
const COLORWAYS = {
  black:    { base: '#131316', dark: '#08080a', light: '#2c2c31', edge: '#ffffff', rim: 0.16, shadow: 0.16 },
  charcoal: { base: '#2c2d32', dark: '#1b1c20', light: '#4a4b52', edge: '#ffffff', rim: 0.14, shadow: 0.16 },
  grey:     { base: '#8a8c92', dark: '#6a6c72', light: '#a8aab0', edge: '#3a3c42', rim: 0.16, shadow: 0.18 },
  bone:     { base: '#e3ded4', dark: '#c8c2b6', light: '#f2eee7', edge: '#4a4438', rim: 0.26, shadow: 0.24 },
  offwhite: { base: '#f0eeea', dark: '#d6d3cc', light: '#fbfaf8', edge: '#45423b', rim: 0.28, shadow: 0.26 },
  slate:    { base: '#464d57', dark: '#2f353d', light: '#646c78', edge: '#ffffff', rim: 0.12, shadow: 0.16 },
  olive:    { base: '#575a44', dark: '#3d402f', light: '#71755c', edge: '#ffffff', rim: 0.12, shadow: 0.16 },
  sand:     { base: '#c6bcab', dark: '#a89d8a', light: '#ded6c9', edge: '#4c4638', rim: 0.24, shadow: 0.22 },
  ink:      { base: '#1a1d24', dark: '#0c0e13', light: '#333844', edge: '#ffffff', rim: 0.15, shadow: 0.16 },
};

const W = 1000;
const H = 1250;

/* ------------------------------------------------------------------ */
/* Shared SVG chrome                                                   */
/* ------------------------------------------------------------------ */

const grainFilter = (id, freq = 0.9, octaves = 3) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>`;

const softShadow = (id) => `
  <filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="26"/>
  </filter>`;

/** Fabric shading: light falls from upper-left, deepens toward lower-right. */
const clothGradients = (id, cw) => `
  <linearGradient id="${id}-fill" x1="0.15" y1="0" x2="0.85" y2="1">
    <stop offset="0%" stop-color="${cw.light}"/>
    <stop offset="42%" stop-color="${cw.base}"/>
    <stop offset="100%" stop-color="${cw.dark}"/>
  </linearGradient>
  <linearGradient id="${id}-sleeve" x1="0" y1="0" x2="1" y2="0.6">
    <stop offset="0%" stop-color="${cw.base}"/>
    <stop offset="100%" stop-color="${cw.dark}"/>
  </linearGradient>
  <linearGradient id="${id}-rib" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${cw.dark}"/>
    <stop offset="100%" stop-color="${cw.base}"/>
  </linearGradient>`;

/** Thin seam/topstitch line. */
const seam = (d, cw, opacity = 0.5) =>
  `<path d="${d}" fill="none" stroke="${cw.dark}" stroke-opacity="${opacity}" stroke-width="2.5" stroke-linecap="round"/>`;

const stitch = (d, cw) =>
  `<path d="${d}" fill="none" stroke="${cw.light}" stroke-opacity="0.35" stroke-width="1.6" stroke-dasharray="7 7" stroke-linecap="round"/>`;

/* ------------------------------------------------------------------ */
/* Garment geometry                                                    */
/* ------------------------------------------------------------------ */
/* Each garment returns { shapes, detail } drawn in a 1000x1250 frame.  */

const garments = {
  /* Oversized hoodie — dropped shoulder, boxy body, kangaroo pocket. */
  hoodie: (g, cw) => ({
    shapes: `
      <path d="M366 300 C 348 168 652 168 634 300 C 600 244 400 244 366 300 Z" fill="url(#${g}-sleeve)"/>
      <path d="M500 252 C 432 252 388 270 372 302 L 252 352 C 202 374 172 402 160 442
               L 94 702 C 88 728 102 746 130 752 L 216 772 C 242 778 260 766 264 742
               L 294 562 L 294 982 C 294 1002 302 1012 322 1012 L 678 1012
               C 698 1012 706 1002 706 982 L 706 562 L 736 742 C 740 766 758 778 784 772
               L 870 752 C 898 746 912 728 906 702 L 840 442 C 828 402 798 374 748 352
               L 628 302 C 612 270 568 252 500 252 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M332 762 C 332 754 338 748 346 748 L 654 748 C 662 748 668 754 668 762
               L 652 902 C 650 912 642 918 632 918 L 368 918 C 358 918 350 912 348 902 Z"
            fill="${cw.dark}" fill-opacity="0.32"/>
      ${seam(`M332 762 L 668 762`, cw, 0.4)}
      ${seam(`M294 562 L 294 982`, cw, 0.28)}
      ${seam(`M706 562 L 706 982`, cw, 0.28)}
      <path d="M294 950 L 706 950 L 706 982 C 706 1002 698 1012 678 1012 L 322 1012
               C 302 1012 294 1002 294 982 Z" fill="url(#${g}-rib)" fill-opacity="0.75"/>
      <path d="M100 716 L 268 756 L 262 742 L 96 700 Z" fill="${cw.dark}" fill-opacity="0.4"/>
      <path d="M900 716 L 732 756 L 738 742 L 904 700 Z" fill="${cw.dark}" fill-opacity="0.4"/>
      <path d="M452 292 C 456 340 452 384 446 420" fill="none" stroke="${cw.light}" stroke-opacity="0.65" stroke-width="7" stroke-linecap="round"/>
      <path d="M548 292 C 544 340 548 384 554 420" fill="none" stroke="${cw.light}" stroke-opacity="0.65" stroke-width="7" stroke-linecap="round"/>
      ${stitch(`M372 302 C 430 330 570 330 628 302`, cw)}`,
  }),

  /* Boxy signature tee — short dropped sleeve, ribbed crew. */
  tee: (g, cw) => ({
    shapes: `
      <path d="M500 288 C 444 288 406 302 392 328 L 268 372 C 226 390 202 414 194 448
               L 152 616 C 146 640 160 656 186 660 L 268 672 C 292 676 308 664 312 642
               L 330 560 L 330 918 C 330 936 338 946 356 946 L 644 946
               C 662 946 670 936 670 918 L 670 560 L 688 642 C 692 664 708 676 732 672
               L 814 660 C 840 656 854 640 848 616 L 806 448 C 798 414 774 390 732 372
               L 608 328 C 594 302 556 288 500 288 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M392 328 C 420 356 580 356 608 328 C 596 300 404 300 392 328 Z"
            fill="url(#${g}-rib)"/>
      ${seam(`M330 560 L 330 918`, cw, 0.24)}
      ${seam(`M670 560 L 670 918`, cw, 0.24)}
      ${stitch(`M336 928 L 664 928`, cw)}
      <path d="M158 632 L 322 654 L 318 638 L 154 614 Z" fill="${cw.dark}" fill-opacity="0.35"/>
      <path d="M842 632 L 678 654 L 682 638 L 846 614 Z" fill="${cw.dark}" fill-opacity="0.35"/>
      <rect x="440" y="700" width="120" height="26" rx="4" fill="${cw.dark}" fill-opacity="0.22"/>`,
  }),

  /* Utility cargo — wide leg, cargo pockets, drawcord waist. */
  cargo: (g, cw) => ({
    shapes: `
      <path d="M320 250 L 680 250 C 692 250 700 258 700 270 L 704 400
               L 736 1090 C 738 1108 728 1118 710 1118 L 592 1118
               C 576 1118 566 1110 564 1094 L 520 640 L 480 640 L 436 1094
               C 434 1110 424 1118 408 1118 L 290 1118 C 272 1118 262 1108 264 1090
               L 296 400 L 300 270 C 300 258 308 250 320 250 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M300 250 L 700 250 L 702 336 L 298 336 Z" fill="url(#${g}-rib)" fill-opacity="0.9"/>
      ${seam(`M500 336 L 500 640`, cw, 0.45)}
      ${seam(`M298 336 L 702 336`, cw, 0.45)}
      <path d="M310 560 L 428 560 C 436 560 440 566 440 574 L 434 728
               C 434 738 428 744 418 744 L 314 744 C 306 744 300 738 300 728 Z"
            fill="${cw.dark}" fill-opacity="0.34"/>
      <path d="M690 560 L 572 560 C 564 560 560 566 560 574 L 566 728
               C 566 738 572 744 582 744 L 686 744 C 694 744 700 738 700 728 Z"
            fill="${cw.dark}" fill-opacity="0.34"/>
      ${stitch(`M304 604 L 436 604`, cw)}
      ${stitch(`M564 604 L 696 604`, cw)}
      <path d="M452 268 C 456 292 456 306 452 322" fill="none" stroke="${cw.light}" stroke-opacity="0.6" stroke-width="6" stroke-linecap="round"/>
      <path d="M548 268 C 544 292 544 306 548 322" fill="none" stroke="${cw.light}" stroke-opacity="0.6" stroke-width="6" stroke-linecap="round"/>
      ${seam(`M268 1040 L 434 1040`, cw, 0.3)}
      ${seam(`M566 1040 L 734 1040`, cw, 0.3)}`,
  }),

  /* Tech bomber — cropped, ribbed collar/hem/cuffs, centre zip. */
  bomber: (g, cw) => ({
    shapes: `
      <path d="M500 276 C 444 276 402 290 388 316 L 262 362 C 214 382 186 410 176 448
               L 130 660 C 124 686 138 704 166 708 L 250 722 C 276 726 292 714 296 690
               L 316 580 L 316 906 C 316 924 324 934 342 934 L 658 934
               C 676 934 684 924 684 906 L 684 580 L 704 690 C 708 714 724 726 750 722
               L 834 708 C 862 704 876 686 870 660 L 824 448 C 814 410 786 382 738 362
               L 612 316 C 598 290 556 276 500 276 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M388 316 C 420 288 580 288 612 316 L 604 262 C 578 244 422 244 396 262 Z"
            fill="url(#${g}-rib)"/>
      <path d="M316 872 L 684 872 L 684 906 C 684 924 676 934 658 934 L 342 934
               C 324 934 316 924 316 906 Z" fill="url(#${g}-rib)"/>
      <path d="M136 674 L 300 700 L 296 682 L 132 654 Z" fill="url(#${g}-rib)"/>
      <path d="M864 674 L 700 700 L 704 682 L 868 654 Z" fill="url(#${g}-rib)"/>
      <rect x="492" y="316" width="16" height="556" fill="${cw.dark}" fill-opacity="0.55"/>
      <rect x="497" y="316" width="6" height="556" fill="${cw.light}" fill-opacity="0.4"/>
      <circle cx="500" cy="640" r="13" fill="${cw.light}" fill-opacity="0.5"/>
      ${seam(`M360 470 L 440 470`, cw, 0.35)}
      ${stitch(`M330 900 L 470 900`, cw)}
      ${stitch(`M530 900 L 670 900`, cw)}`,
  }),

  /* Essential shirt — camp collar, placket, buttons, chest pocket. */
  shirt: (g, cw) => ({
    shapes: `
      <path d="M500 282 C 452 282 418 294 404 316 L 288 358 C 250 374 228 396 220 428
               L 178 618 C 172 642 186 658 212 662 L 288 674 C 312 678 328 666 332 644
               L 348 566 L 348 962 C 348 980 356 990 374 990 L 626 990
               C 644 990 652 980 652 962 L 652 566 L 668 644 C 672 666 688 678 712 674
               L 788 662 C 814 658 828 642 822 618 L 780 428 C 772 396 750 374 712 358
               L 596 316 C 582 294 548 282 500 282 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M404 316 L 500 400 L 596 316 L 566 292 L 500 344 L 434 292 Z"
            fill="${cw.light}" fill-opacity="0.28"/>
      <path d="M404 316 L 500 400 L 460 302 Z" fill="${cw.dark}" fill-opacity="0.3"/>
      <path d="M596 316 L 500 400 L 540 302 Z" fill="${cw.dark}" fill-opacity="0.3"/>
      <rect x="484" y="396" width="32" height="594" fill="${cw.light}" fill-opacity="0.16"/>
      ${seam(`M484 396 L 484 990`, cw, 0.4)}
      ${seam(`M516 396 L 516 990`, cw, 0.4)}
      ${[470, 560, 650, 740, 830, 920].map((y) => `<circle cx="500" cy="${y}" r="8" fill="${cw.dark}" fill-opacity="0.6"/>`).join('')}
      <path d="M366 470 L 452 470 L 452 566 L 366 566 Z" fill="${cw.dark}" fill-opacity="0.22"/>
      ${stitch(`M366 470 L 452 470`, cw)}`,
  }),

  /* Everyday trouser — clean tapered leg. */
  trouser: (g, cw) => ({
    shapes: `
      <path d="M336 262 L 664 262 C 674 262 682 270 682 280 L 690 396
               L 706 1104 C 706 1118 698 1126 684 1126 L 588 1126
               C 576 1126 568 1118 566 1106 L 522 660 L 478 660 L 434 1106
               C 432 1118 424 1126 412 1126 L 316 1126 C 302 1126 294 1118 294 1104
               L 310 396 L 318 280 C 318 270 326 262 336 262 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M318 262 L 682 262 L 684 330 L 316 330 Z" fill="url(#${g}-rib)" fill-opacity="0.85"/>
      ${seam(`M500 330 L 500 660`, cw, 0.42)}
      ${seam(`M400 340 L 372 1100`, cw, 0.22)}
      ${seam(`M600 340 L 628 1100`, cw, 0.22)}
      <path d="M330 340 C 360 380 372 410 372 452" fill="none" stroke="${cw.dark}" stroke-opacity="0.35" stroke-width="3"/>
      <path d="M670 340 C 640 380 628 410 628 452" fill="none" stroke="${cw.dark}" stroke-opacity="0.35" stroke-width="3"/>
      <circle cx="500" cy="296" r="9" fill="${cw.dark}" fill-opacity="0.6"/>`,
  }),

  /* Structured jacket — tailored, notch lapel, longer line. */
  jacket: (g, cw) => ({
    shapes: `
      <path d="M500 258 C 446 258 408 272 392 300 L 254 348 C 206 368 178 398 170 438
               L 128 700 C 122 728 138 746 166 750 L 252 764 C 278 768 294 756 298 732
               L 318 596 L 306 1050 C 305 1068 314 1078 332 1078 L 668 1078
               C 686 1078 695 1068 694 1050 L 682 596 L 702 732 C 706 756 722 768 748 764
               L 834 750 C 862 746 878 728 872 700 L 830 438 C 822 398 794 368 746 348
               L 608 300 C 592 272 554 258 500 258 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M392 300 L 500 470 L 470 288 Z" fill="${cw.light}" fill-opacity="0.22"/>
      <path d="M608 300 L 500 470 L 530 288 Z" fill="${cw.light}" fill-opacity="0.22"/>
      <path d="M470 288 L 500 470 L 530 288 C 520 274 480 274 470 288 Z" fill="${cw.dark}" fill-opacity="0.35"/>
      ${seam(`M500 470 L 500 1078`, cw, 0.45)}
      ${seam(`M380 470 C 372 700 366 900 372 1070`, cw, 0.2)}
      ${seam(`M620 470 C 628 700 634 900 628 1070`, cw, 0.2)}
      <path d="M356 800 L 462 800 L 462 828 L 356 828 Z" fill="${cw.dark}" fill-opacity="0.3"/>
      <path d="M644 800 L 538 800 L 538 828 L 644 828 Z" fill="${cw.dark}" fill-opacity="0.3"/>
      ${[560, 660].map((y) => `<circle cx="470" cy="${y}" r="9" fill="${cw.dark}" fill-opacity="0.65"/>`).join('')}`,
  }),

  /* Performance set — training top over shorts, shown as a styled pair. */
  activeset: (g, cw) => ({
    shapes: `
      <path d="M500 214 C 456 214 426 226 414 248 L 316 284 C 282 298 264 318 258 344
               L 224 486 C 219 506 231 520 252 523 L 314 533 C 334 536 347 526 350 508
               L 364 444 L 364 690 C 364 706 371 714 386 714 L 614 714
               C 629 714 636 706 636 690 L 636 444 L 650 508 C 653 526 666 536 686 533
               L 748 523 C 769 520 781 506 776 486 L 742 344 C 736 318 718 298 684 284
               L 586 248 C 574 226 544 214 500 214 Z" fill="url(#${g}-fill)"/>
      <path d="M368 762 L 632 762 C 644 762 652 770 652 782 L 660 1052
               C 661 1066 653 1074 640 1074 L 556 1074 C 545 1074 538 1067 536 1056
               L 512 900 L 488 900 L 464 1056 C 462 1067 455 1074 444 1074 L 360 1074
               C 347 1074 339 1066 340 1052 L 348 782 C 348 770 356 762 368 762 Z"
            fill="url(#${g}-sleeve)"/>`,
    detail: `
      <path d="M414 248 C 442 274 558 274 586 248 C 574 226 426 226 414 248 Z" fill="url(#${g}-rib)"/>
      <path d="M348 762 L 652 762 L 653 812 L 347 812 Z" fill="${cw.dark}" fill-opacity="0.4"/>
      ${seam(`M500 812 L 500 900`, cw, 0.4)}
      <path d="M420 320 L 420 700" stroke="${cw.light}" stroke-opacity="0.3" stroke-width="3" fill="none"/>
      <path d="M580 320 L 580 700" stroke="${cw.light}" stroke-opacity="0.3" stroke-width="3" fill="none"/>
      ${stitch(`M372 700 L 628 700`, cw)}
      <path d="M452 786 C 456 796 456 802 452 810" stroke="${cw.light}" stroke-opacity="0.55" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M548 786 C 544 796 544 802 548 810" stroke="${cw.light}" stroke-opacity="0.55" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  }),

  /* Slip / column dress for the women's edit. */
  dress: (g, cw) => ({
    shapes: `
      <path d="M394 268 C 420 300 580 300 606 268 L 640 300
               C 676 340 696 392 702 452 L 744 1052 C 746 1074 734 1086 712 1086
               L 288 1086 C 266 1086 254 1074 256 1052 L 298 452
               C 304 392 324 340 360 300 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M394 268 C 420 300 580 300 606 268 C 584 250 416 250 394 268 Z" fill="${cw.dark}" fill-opacity="0.3"/>
      <path d="M360 300 C 352 250 348 232 344 214" stroke="${cw.light}" stroke-opacity="0.5" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M640 300 C 648 250 652 232 656 214" stroke="${cw.light}" stroke-opacity="0.5" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${seam(`M420 340 C 400 600 388 860 396 1070`, cw, 0.18)}
      ${seam(`M580 340 C 600 600 612 860 604 1070`, cw, 0.18)}
      ${seam(`M500 320 L 500 1080`, cw, 0.12)}
      ${stitch(`M262 1046 L 738 1046`, cw)}`,
  }),

  /* Accessories */
  cap: (g, cw) => ({
    shapes: `
      <path d="M500 372 C 340 372 250 476 244 610 C 243 632 254 644 276 644
               L 724 644 C 746 644 757 632 756 610 C 750 476 660 372 500 372 Z"
            fill="url(#${g}-fill)"/>
      <path d="M276 644 C 236 656 176 688 152 726 C 140 746 148 762 172 764
               L 690 780 C 726 782 742 762 730 738 C 706 690 640 656 724 644 Z"
            fill="url(#${g}-sleeve)"/>`,
    detail: `
      ${seam(`M500 372 L 500 644`, cw, 0.4)}
      ${seam(`M392 386 C 372 476 366 560 368 644`, cw, 0.25)}
      ${seam(`M608 386 C 628 476 634 560 632 644`, cw, 0.25)}
      <circle cx="500" cy="386" r="14" fill="${cw.light}" fill-opacity="0.4"/>
      ${stitch(`M280 656 C 400 690 600 690 716 656`, cw)}`,
  }),

  tote: (g, cw) => ({
    shapes: `
      <path d="M292 452 L 708 452 C 726 452 738 464 740 482 L 782 1016
               C 784 1038 770 1052 748 1052 L 252 1052 C 230 1052 216 1038 218 1016
               L 260 482 C 262 464 274 452 292 452 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M370 452 C 370 320 630 320 630 452" fill="none" stroke="${cw.base}" stroke-width="26" stroke-linecap="round"/>
      <path d="M370 452 C 370 320 630 320 630 452" fill="none" stroke="${cw.dark}" stroke-opacity="0.45" stroke-width="10" stroke-linecap="round"/>
      ${seam(`M260 488 L 740 488`, cw, 0.3)}
      <rect x="430" y="700" width="140" height="44" rx="3" fill="${cw.dark}" fill-opacity="0.25"/>
      ${stitch(`M232 1010 L 768 1010`, cw)}`,
  }),

  sunglasses: (g, cw) => ({
    shapes: `
      <path d="M170 520 C 250 486 400 480 470 500 C 490 506 510 506 530 500
               C 600 480 750 486 830 520 C 848 528 852 546 844 566
               C 820 626 780 686 726 704 C 646 730 570 686 552 606
               C 546 574 542 556 500 556 C 458 556 454 574 448 606
               C 430 686 354 730 274 704 C 220 686 180 626 156 566
               C 148 546 152 528 170 520 Z" fill="url(#${g}-fill)"/>`,
    detail: `
      <path d="M196 540 C 264 516 390 514 442 534 C 452 578 428 660 352 674
               C 288 686 236 626 208 570 C 200 554 190 544 196 540 Z" fill="${cw.dark}" fill-opacity="0.55"/>
      <path d="M804 540 C 736 516 610 514 558 534 C 548 578 572 660 648 674
               C 712 686 764 626 792 570 C 800 554 810 544 804 540 Z" fill="${cw.dark}" fill-opacity="0.55"/>
      <path d="M240 556 C 270 540 320 532 360 536" stroke="${cw.light}" stroke-opacity="0.5" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M760 556 C 730 540 680 532 640 536" stroke="${cw.light}" stroke-opacity="0.5" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  }),
};

/**
 * Back / alternate framing: the same garment, cropped in as a detail shot.
 *
 * Note there is no full-canvas grain layer here. These plates sit on a
 * transparent ground so they can be used on both white and inverted sections,
 * and a full-bleed overlay rect composites as a visible grey box on white.
 * Grain is applied only to campaign plates, which have a real background.
 */
function garmentSVG(kind, colorway, { detailCrop = false, id = 'a' } = {}) {
  const cw = COLORWAYS[colorway] || COLORWAYS.black;
  const g = garments[kind] ? garments[kind](id, cw) : garments.tee(id, cw);
  const viewBox = detailCrop ? `250 400 500 625` : `0 0 ${W} ${H}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${W}" height="${H}" role="img" aria-label="${kind} in ${colorway}">
  <defs>
    ${clothGradients(id, cw)}
    ${grainFilter(`${id}-grain`, 1.1)}
    ${softShadow(`${id}-shadow`)}
  </defs>
  <ellipse cx="500" cy="1105" rx="250" ry="34" fill="#000" opacity="${cw.shadow}" filter="url(#${id}-shadow)"/>
  <g filter="none">
    ${g.shapes}
  </g>
  <g stroke="none">${g.detail}</g>
  <g fill="none" stroke="${cw.edge}" stroke-opacity="${cw.rim}" stroke-width="2">
    ${g.shapes.replace(/fill="[^"]*"/g, 'fill="none"')}
  </g>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Campaign plates                                                     */
/* ------------------------------------------------------------------ */

const MONO = `'Helvetica Neue',Helvetica,Arial,sans-serif`;

const label = (text, x, y, fill, size = 15) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" letter-spacing="4"
     fill="${fill}" fill-opacity="0.7" font-weight="500">${text}</text>`;

/**
 * Abstracted standing figure — a suggestion of a model, never a photo.
 *
 * Drawn to fashion-plate proportions (roughly nine heads tall, narrow
 * shoulders, long leg line) with limbs as separate tapered paths. The earlier
 * single-blob version read as a pictogram once cropped into a card.
 */
const figure = (cx, baseY, scale, fill, opacity) => `
  <g transform="translate(${cx},${baseY}) scale(${scale})" fill="${fill}" fill-opacity="${opacity}">
    <ellipse cx="0" cy="-408" rx="17" ry="23"/>
    <path d="M-5 -388 h10 l3 20 h-16 Z"/>

    <!-- torso: shoulder line to hip, gently tapered -->
    <path d="M-38 -368 C -16 -376 16 -376 38 -368
             C 44 -366 47 -360 47 -352
             L 42 -252 C 41 -240 38 -231 34 -224
             L 30 -206 L -30 -206 L -34 -224
             C -38 -231 -41 -240 -42 -252
             L -47 -352 C -47 -360 -44 -366 -38 -368 Z"/>

    <!-- arms -->
    <path d="M-46 -356 C -54 -352 -57 -342 -58 -330
             L -63 -246 C -64 -236 -61 -230 -54 -229
             C -48 -228 -44 -232 -43 -241 L -37 -330 Z"/>
    <path d="M46 -356 C 54 -352 57 -342 58 -330
             L 63 -246 C 64 -236 61 -230 54 -229
             C 48 -228 44 -232 43 -241 L 37 -330 Z"/>

    <!-- legs: long line, small gap at the centre -->
    <path d="M-30 -200 L -4 -200 L -6 -104 L -9 -6
             C -9 -1 -12 2 -18 2 L -30 2 C -36 2 -39 -1 -39 -7
             L -35 -104 Z"/>
    <path d="M4 -200 L 30 -200 L 35 -104 L 39 -7
             C 39 -1 36 2 30 2 L 18 2 C 12 2 9 -1 9 -6
             L 6 -104 Z"/>
  </g>`;

function campaign(kind) {
  const id = kind.replace(/[^a-z]/g, '');
  const plates = {
    street: {
      w: 1600, h: 1000,
      bg: `<rect width="1600" height="1000" fill="#0a0a0c"/>
        <linearGradient id="${id}-sky" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stop-color="#1d1f26"/><stop offset="100%" stop-color="#08080a"/>
        </linearGradient>
        <rect width="1600" height="1000" fill="url(#${id}-sky)"/>
        ${[80, 300, 520, 1120, 1340].map((x, i) => `<rect x="${x}" y="${120 + i * 46}" width="${150 + i * 18}" height="${880 - i * 46}" fill="#101116" opacity="${0.9 - i * 0.09}"/>`).join('')}
        ${Array.from({ length: 44 }, (_, i) => `<rect x="${100 + (i % 11) * 132}" y="${180 + Math.floor(i / 11) * 150}" width="26" height="38" fill="#cfd3dd" opacity="${0.05 + ((i * 7) % 9) / 90}"/>`).join('')}
        <rect y="700" width="1600" height="300" fill="#000" opacity="0.55"/>`,
      fg: `${figure(560, 940, 1.25, '#e8e9ee', 0.9)}
        ${figure(880, 950, 1.05, '#b9bcc6', 0.5)}
        ${Array.from({ length: 7 }, (_, i) => `<rect x="${180 + i * 190}" y="${560 + i * 12}" width="240" height="3" fill="#fff" opacity="0.12"/>`).join('')}`,
      text: '#f4f4f6',
    },
    minimal: {
      w: 1600, h: 1000,
      bg: `<rect width="1600" height="1000" fill="#f4f2ee"/>
        <radialGradient id="${id}-r" cx="0.42" cy="0.34" r="0.72">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e4e1da"/>
        </radialGradient>
        <rect width="1600" height="1000" fill="url(#${id}-r)"/>`,
      fg: `<ellipse cx="800" cy="960" rx="300" ry="26" fill="#8d8877" opacity="0.18"/>
        ${figure(800, 930, 1.32, '#22242a', 0.86)}
        <rect x="150" y="150" width="1300" height="700" fill="none" stroke="#22242a" stroke-opacity="0.1"/>`,
      text: '#22242a',
    },
    active: {
      w: 1600, h: 1000,
      bg: `<rect width="1600" height="1000" fill="#0e0f12"/>
        <linearGradient id="${id}-d" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#26282f"/><stop offset="60%" stop-color="#0d0e11"/>
        </linearGradient>
        <rect width="1600" height="1000" fill="url(#${id}-d)"/>
        ${Array.from({ length: 16 }, (_, i) => `<rect x="${-200 + i * 120}" y="0" width="${34 + (i % 4) * 22}" height="1000" fill="#fff" opacity="${0.018 + (i % 5) * 0.008}" transform="skewX(-18)"/>`).join('')}`,
      fg: `${[0.28, 0.52, 0.8].map((o, i) => figure(680 + i * 90, 930 - i * 8, 1.18, '#f2f3f6', o)).join('')}
        ${Array.from({ length: 5 }, (_, i) => `<rect x="${300 + i * 40}" y="${420 + i * 78}" width="${420 - i * 40}" height="6" fill="#fff" opacity="0.16" transform="skewX(-18)"/>`).join('')}`,
      text: '#f2f3f6',
    },
    luxury: {
      w: 1600, h: 1000,
      bg: `<rect width="1600" height="1000" fill="#101014"/>
        <linearGradient id="${id}-l" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stop-color="#2a2b31"/><stop offset="55%" stop-color="#131418"/><stop offset="100%" stop-color="#0a0a0d"/>
        </linearGradient>
        <rect width="1600" height="1000" fill="url(#${id}-l)"/>
        ${Array.from({ length: 9 }, (_, i) => `<path d="M${180 + i * 150} 0 C ${230 + i * 150} 320 ${120 + i * 150} 640 ${200 + i * 150} 1000 L ${260 + i * 150} 1000 C ${190 + i * 150} 640 ${300 + i * 150} 320 ${250 + i * 150} 0 Z" fill="#f0eee9" opacity="${0.028 + (i % 3) * 0.016}"/>`).join('')}`,
      fg: `${figure(800, 940, 1.36, '#e9e6df', 0.42)}
        <rect x="120" y="120" width="1360" height="760" fill="none" stroke="#e9e6df" stroke-opacity="0.14"/>`,
      text: '#e9e6df',
    },
    fabric: {
      w: 1600, h: 1000,
      bg: `<rect width="1600" height="1000" fill="#17181c"/>
        <filter id="${id}-w"><feTurbulence type="turbulence" baseFrequency="0.012 0.4" numOctaves="4"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer></filter>
        <rect width="1600" height="1000" filter="url(#${id}-w)" opacity="0.5"/>
        <linearGradient id="${id}-fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3a3c44" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#0c0d10" stop-opacity="0.95"/></linearGradient>
        <rect width="1600" height="1000" fill="url(#${id}-fg)"/>`,
      fg: `${Array.from({ length: 26 }, (_, i) => `<path d="M0 ${i * 40} C 400 ${i * 40 - 30} 1200 ${i * 40 + 34} 1600 ${i * 40}" stroke="#fff" stroke-opacity="0.05" fill="none" stroke-width="2"/>`).join('')}`,
      text: '#e6e7ea',
    },
    portrait: {
      w: 1200, h: 1500,
      bg: `<rect width="1200" height="1500" fill="#111216"/>
        <radialGradient id="${id}-p" cx="0.45" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="#2b2d34"/><stop offset="100%" stop-color="#0b0c0f"/></radialGradient>
        <rect width="1200" height="1500" fill="url(#${id}-p)"/>`,
      fg: `<g fill="#e7e8ec" fill-opacity="0.86">
          <ellipse cx="600" cy="600" rx="192" ry="238"/>
          <path d="M600 880 C 380 880 250 1000 226 1180 L 200 1500 L 1000 1500 L 974 1180 C 950 1000 820 880 600 880 Z"/>
        </g>
        <path d="M600 362 C 470 362 400 452 404 560 L 408 640 C 380 560 386 420 470 356 C 540 302 690 306 744 380 C 800 456 792 570 776 640 L 782 546 C 792 440 726 362 600 362 Z" fill="#0e0f12" fill-opacity="0.9"/>
        <ellipse cx="600" cy="1500" rx="520" ry="120" fill="#000" opacity="0.4"/>`,
      text: '#e7e8ec',
    },
    editorial: {
      w: 1600, h: 1000,
      bg: `<rect width="1600" height="1000" fill="#ecebe6"/>
        <linearGradient id="${id}-e" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fbfaf8"/><stop offset="100%" stop-color="#dedbd3"/></linearGradient>
        <rect width="1600" height="1000" fill="url(#${id}-e)"/>
        <rect x="0" y="0" width="640" height="1000" fill="#20222a" opacity="0.94"/>`,
      fg: `${figure(1080, 930, 1.22, '#25272e', 0.8)}
        ${figure(360, 930, 1.1, '#f1f0ec', 0.9)}`,
      text: '#25272e',
    },
  };

  const p = plates[kind] || plates.street;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}" role="img" aria-label="${kind} campaign placeholder">
  <defs>${grainFilter(`${id}-grain`, 0.75)}</defs>
  ${p.bg}
  ${p.fg}
  <rect width="${p.w}" height="${p.h}" filter="url(#${id}-grain)" opacity="0.07" style="mix-blend-mode:overlay"/>
  ${label(`[ ${kind.toUpperCase()} — PLACEHOLDER ]`, 48, p.h - 48, p.text)}
  ${label('NØVA', p.w - 110, p.h - 48, p.text, 16)}
</svg>`;
}

/**
 * Portrait plates for tall crops (the CHOOSE YOUR WORLD cards, mega-menu
 * previews). A landscape campaign plate cropped into a 3:4 column keeps only a
 * narrow vertical slice and loses its composition, so these are drawn at
 * 1200x1500 with the figure centred for exactly that aspect.
 */
function worldPlate(kind) {
  const id = `w${kind}`;
  const W2 = 1200;
  const H2 = 1500;

  const schemes = {
    street: {
      bg: `<linearGradient id="${id}-g" x1="0" y1="0" x2="0.3" y2="1">
             <stop offset="0%" stop-color="#22242b"/><stop offset="100%" stop-color="#08080a"/>
           </linearGradient>
           <rect width="${W2}" height="${H2}" fill="url(#${id}-g)"/>
           ${[60, 250, 830, 1010].map((x, i) => `<rect x="${x}" y="${140 + i * 60}" width="${140 + i * 20}" height="${H2}" fill="#0e0f13" opacity="${0.8 - i * 0.12}"/>`).join('')}
           ${Array.from({ length: 30 }, (_, i) => `<rect x="${80 + (i % 6) * 180}" y="${200 + Math.floor(i / 6) * 190}" width="24" height="34" fill="#ccd2de" opacity="${0.05 + ((i * 5) % 8) / 100}"/>`).join('')}`,
      fig: `${figure(600, 1420, 2.85, '#eceef3', 0.9)}`,
      text: '#f4f4f6',
    },
    minimal: {
      bg: `<radialGradient id="${id}-g" cx="0.5" cy="0.3" r="0.85">
             <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dfdcd4"/>
           </radialGradient>
           <rect width="${W2}" height="${H2}" fill="url(#${id}-g)"/>`,
      fig: `<ellipse cx="600" cy="1436" rx="240" ry="26" fill="#8d8877" opacity="0.2"/>
            ${figure(600, 1420, 2.95, '#22242a', 0.88)}`,
      text: '#22242a',
    },
    active: {
      bg: `<linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1">
             <stop offset="0%" stop-color="#2a2d35"/><stop offset="70%" stop-color="#0c0d10"/>
           </linearGradient>
           <rect width="${W2}" height="${H2}" fill="url(#${id}-g)"/>
           ${Array.from({ length: 14 }, (_, i) => `<rect x="${-260 + i * 130}" y="0" width="${28 + (i % 3) * 20}" height="${H2}" fill="#fff" opacity="${0.02 + (i % 4) * 0.009}" transform="skewX(-16)"/>`).join('')}`,
      fig: `${figure(520, 1420, 2.7, '#f2f3f6', 0.32)}
            ${figure(640, 1425, 2.8, '#f2f3f6', 0.85)}`,
      text: '#f2f3f6',
    },
    luxury: {
      bg: `<linearGradient id="${id}-g" x1="0.2" y1="0" x2="0.9" y2="1">
             <stop offset="0%" stop-color="#2d2e34"/><stop offset="55%" stop-color="#141519"/><stop offset="100%" stop-color="#0a0a0d"/>
           </linearGradient>
           <rect width="${W2}" height="${H2}" fill="url(#${id}-g)"/>
           ${Array.from({ length: 7 }, (_, i) => `<path d="M${100 + i * 170} 0 C ${150 + i * 170} 480 ${60 + i * 170} 960 ${130 + i * 170} ${H2} L ${190 + i * 170} ${H2} C ${120 + i * 170} 960 ${220 + i * 170} 480 ${170 + i * 170} 0 Z" fill="#f0eee9" opacity="${0.03 + (i % 3) * 0.015}"/>`).join('')}`,
      fig: `${figure(600, 1425, 3.0, '#e9e6df', 0.5)}`,
      text: '#e9e6df',
    },
  };

  const s = schemes[kind] || schemes.street;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}" role="img" aria-label="${kind} placeholder">
  <defs>${grainFilter(`${id}-grain`, 0.8)}</defs>
  ${s.bg}
  ${s.fig}
  <rect width="${W2}" height="${H2}" filter="url(#${id}-grain)" opacity="0.07" style="mix-blend-mode:overlay"/>
  ${/* Top-left, because these plates are used in cards that print their own
       label along the bottom edge. */ ''}
  ${label(`[ ${kind.toUpperCase()} ]`, 40, 64, s.text, 14)}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const written = [];
const write = (name, svg) => {
  writeFileSync(path.join(out, name), svg.replace(/\n\s*\n/g, '\n'));
  written.push(name);
};

/* Garment renders: primary + hover/alternate for every product colorway. */
const GARMENT_SET = [
  ['hoodie', ['black', 'bone', 'grey']],
  ['cargo', ['olive', 'black', 'sand']],
  ['tee', ['offwhite', 'black', 'sand']],
  ['bomber', ['ink', 'charcoal']],
  ['shirt', ['bone', 'slate']],
  ['trouser', ['charcoal', 'sand']],
  ['jacket', ['black', 'slate']],
  ['activeset', ['charcoal', 'black']],
  ['dress', ['black', 'bone']],
  ['cap', ['black', 'bone']],
  ['tote', ['sand', 'black']],
  ['sunglasses', ['ink']],
];

for (const [kind, ways] of GARMENT_SET) {
  for (const way of ways) {
    write(`nova-${kind}-${way}.svg`, garmentSVG(kind, way, { id: `${kind}${way}` }));
    write(`nova-${kind}-${way}-alt.svg`, garmentSVG(kind, way, { id: `${kind}${way}b`, detailCrop: true }));
  }
}

for (const kind of ['street', 'minimal', 'active', 'luxury', 'fabric', 'portrait', 'editorial']) {
  write(`nova-campaign-${kind}.svg`, campaign(kind));
}

for (const kind of ['street', 'minimal', 'active', 'luxury']) {
  write(`nova-world-${kind}.svg`, worldPlate(kind));
}

/* Journal covers reuse the campaign language at article proportions. */
for (const [slug, kind] of [
  ['journal-streetwear', 'street'],
  ['journal-oversized', 'editorial'],
  ['journal-drop', 'fabric'],
]) {
  write(`nova-${slug}.svg`, campaign(kind));
}

console.log(`[nova:art] wrote ${written.length} SVG assets to assets/`);
