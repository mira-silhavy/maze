import type {
  AspectRatioId,
  GameMode,
  MazeAlgorithm,
  MazeStyle,
} from './maze/types';
import type { ThemeId } from './themes/catalog';

export type Language = 'cs' | 'en';

export interface ThemeStory {
  classicSubtitle: string;
  circularSubtitle: string;
  collectSubtitle: string;
  winClassicTitle: string;
  winCollectTitle: string;
  collectLabel: string;
}

export interface Messages {
  appTitle: string;
  switchLanguageLabel: string;
  switchLanguageTitle: string;
  languageBadge: string;

  // SettingsPanel top actions
  hint: string;
  hintTitle: string;
  start: string;
  startTitle: string;
  newMaze: string;
  newMazeTitle: string;
  trailLabel: string;
  trailOnTitle: string;
  trailOffTitle: string;
  soundOnTitle: string;
  soundOffTitle: string;
  printLabel: string;
  printTitle: string;
  fullscreenLabel: string;
  fullscreenTitle: string;
  helpLabel: string;
  helpShowTitle: string;
  helpHideTitle: string;

  // SettingsPanel section labels & options
  modeLabel: string;
  styleLabel: string;
  generatorLabel: string;
  themeLabel: string;
  targetCountLabel: string;
  allTargets: string;
  marble: string;
  marbleTitle: string;
  fog: string;
  fogTitle: string;
  bridges: string;
  bridgesTitle: string;
  braided: string;
  braidedTitle: string;

  // Presets
  difficulties: Record<string, string>;
  ringsCount: (n: number) => string;
  aspects: Record<AspectRatioId, string>;
  aspectTitle: (label: string, ratio: string) => string;
  modes: Record<GameMode, string>;
  modeTitles: Record<GameMode, string>;
  styles: Record<MazeStyle, string>;
  algorithms: Record<MazeAlgorithm, string>;
  themes: Record<ThemeId, string>;
  stories: Record<ThemeId, ThemeStory>;

  // Help bar
  helpControls: string;
  helpOr: string;
  helpDrag: string;
  helpNewMaze: string;
  helpFullscreen: string;

  // StatsRow
  statTime: string;
  statSteps: string;
  statOptimum: string;

  // WinOverlay
  winTime: string;
  winSteps: string;
  winOptimum: (n: number) => string;
  winNewMaze: string;

  // FocusToolbar
  focusMarbleOn: string;
  focusMarbleOff: string;
  focusFogOn: string;
  focusFogOff: string;
  focusBrowserFullscreenEnter: string;
  focusBrowserFullscreenExit: string;
  focusMenu: string;
  focusMenuTitle: string;
  menuCollapse: string;
  menuExpand: string;

  // Marble tilt bar
  tiltEnable: string;
  tiltDenied: string;
  tiltHintGyro: string;
  tiltHintFallback: string;
  tiltCalibrate: string;
  tiltCalibrateTitle: string;

  // Aria labels & Print
  ariaCurvedMaze: string;
  ariaCircularMaze: string;
  printClassicTitle: string;
  printClassicSubtitle: string;
  printCollectTitle: (count: number) => string;
  printCollectSubtitle: string;
}

const CS: Messages = {
  appTitle: 'Bludiště',
  switchLanguageLabel: 'Přepnout jazyk na angličtinu',
  switchLanguageTitle: 'Switch to English',
  languageBadge: 'CZ',

  hint: 'Nápověda',
  hintTitle: 'Zobrazit nápovědu',
  start: 'Start',
  startTitle: 'Vrátit se na start',
  newMaze: 'Nové',
  newMazeTitle: 'Nové bludiště',
  trailLabel: 'Zobrazit stopu',
  trailOnTitle: 'Stopa zapnuta: kreslí prošlou cestu',
  trailOffTitle: 'Stopa vypnuta: cesta se nekreslí',
  soundOnTitle: 'Vypnout zvuky',
  soundOffTitle: 'Zapnout zvuky',
  printLabel: 'Tisk na A4',
  printTitle: 'Vytisknout čisté černobílé bludiště na A4',
  fullscreenLabel: 'Celá obrazovka',
  fullscreenTitle: 'Skrýt menu a roztáhnout bludiště na celou obrazovku (F)',
  helpLabel: 'Nápověda k ovládání',
  helpShowTitle: 'Zobrazit nápovědu k ovládání',
  helpHideTitle: 'Skrýt nápovědu k ovládání',

  modeLabel: 'Režim:',
  styleLabel: 'Styl:',
  generatorLabel: 'Generátor:',
  themeLabel: 'Motiv:',
  targetCountLabel: 'Počet cílů:',
  allTargets: 'Vše',
  marble: 'Kulička',
  marbleTitle: 'Kutálení kuličky nakláněním tabletu (na PC drž šipky / WASD)',
  fog: 'Mlha',
  fogTitle: 'Mlha války se svítilnou — neprozkoumané bludiště je skryté v temnotě',
  bridges: 'Mosty',
  bridgesTitle: 'Mosty (nad/pod) — počet roste s velikostí bludiště',
  braided: 'Smyčky',
  braidedTitle: 'Propojí část slepých uliček do smyček (více možných cest)',

  difficulties: {
    small: 'Malé',
    medium: 'Střední',
    large: 'Velké',
    huge: 'Obří',
  },
  ringsCount: (n) => `${n} kruhů`,
  aspects: {
    square: 'Čtverec',
    tablet: 'Tablet',
    widescreen: 'Širokoúhlé',
  },
  aspectTitle: (label, ratio) => `Poměr stran: ${label} (${ratio})`,
  modes: {
    classic: 'Start → Cíl',
    collect: '✕ → ◯',
  },
  modeTitles: {
    classic: 'Start → Cíl',
    collect: 'Od křížku ke kolečku',
  },
  styles: {
    classic: 'Hranaté',
    curved: 'Křivky',
    circular: 'Kruhové',
  },
  algorithms: {
    backtracker: 'Klikaté',
    prim: 'Větvené',
    kruskal: 'Rovnoměrné',
  },
  themes: {
    space: 'Vesmír',
    hologram: 'Hologram',
    forest: 'Les',
    pirate: 'Poklad',
    paper: 'Papír',
  },
  stories: {
    space: {
      classicSubtitle: 'Doveď raketu vesmírným bludištěm až k planetě!',
      circularSubtitle:
        'Vyleť s raketou od okraje galaxie až k planetě v jejím středu!',
      collectSubtitle: 'Vyleť od křížku ✕ a posbírej všechny zářící hvězdy!',
      winClassicTitle: 'Přistání na planetě!',
      winCollectTitle: 'Všechny hvězdy posbírány!',
      collectLabel: 'Hvězdy',
    },
    hologram: {
      classicSubtitle: 'Proleť holografickou hvězdnou mapou až k cílové planetě!',
      circularSubtitle:
        'Proleť od okraje radaru až k cíli ve středu hvězdné mapy!',
      collectSubtitle: 'Vydej se od křížku ✕ a zachyť všechny zářící signály!',
      winClassicTitle: 'Cíl zaměřen!',
      winCollectTitle: 'Všechny signály zachyceny!',
      collectLabel: 'Signály',
    },
    forest: {
      classicSubtitle: 'Pomoz lišce projít lesem až k útulné chatce!',
      circularSubtitle: 'Proveď lišku od okraje lesa až k chatce v jeho středu!',
      collectSubtitle: 'Vydej se od křížku ✕ a posbírej všechny lesní plody!',
      winClassicTitle: 'Liška je v chatce!',
      winCollectTitle: 'Všechny plody posbírány!',
      collectLabel: 'Plody',
    },
    pirate: {
      classicSubtitle: 'Doveď pirátskou loď po mapě až k truhle s pokladem!',
      circularSubtitle:
        'Vypluj od pobřeží ostrova až k truhle s pokladem uprostřed!',
      collectSubtitle: 'Vypluj od křížku ✕ a posbírej všechny zlaté mince!',
      winClassicTitle: 'Poklad nalezen!',
      winCollectTitle: 'Všechny mince posbírány!',
      collectLabel: 'Mince',
    },
    paper: {
      classicSubtitle:
        'Najdi tužkou cestu z levého horního rohu do zeleného cíle.',
      circularSubtitle:
        'Dostaň se od okraje kruhového bludiště až do jeho středu.',
      collectSubtitle: 'Od křížku ✕ ke kolečkům ◯ — posbírej všechna kolečka!',
      winClassicTitle: 'Bludiště vyřešeno!',
      winCollectTitle: 'Všechna kolečka posbírána!',
      collectLabel: 'Kolečka',
    },
  },

  helpControls: 'Ovládání:',
  helpOr: 'nebo',
  helpDrag: 'tažení prstem po bludišti',
  helpNewMaze: 'nové bludiště',
  helpFullscreen: 'celá obrazovka',

  statTime: 'Čas',
  statSteps: 'Kroky',
  statOptimum: 'Optimum',

  winTime: 'Čas:',
  winSteps: 'Kroky:',
  winOptimum: (n) => `(optimum ${n})`,
  winNewMaze: 'Nové bludiště',

  focusMarbleOn: 'Vypnout kuličku',
  focusMarbleOff: 'Zapnout kuličku (náklon)',
  focusFogOn: 'Vypnout mlhu',
  focusFogOff: 'Zapnout mlhu se svítilnou',
  focusBrowserFullscreenEnter: 'Skrýt lišty prohlížeče',
  focusBrowserFullscreenExit: 'Ukončit celou obrazovku prohlížeče',
  focusMenu: 'Menu',
  focusMenuTitle: 'Zobrazit menu (Esc)',
  menuCollapse: 'Skrýt menu',
  menuExpand: 'Zobrazit menu',

  tiltEnable: 'Povolit náklon tabletu',
  tiltDenied:
    'Přístup k náklonu byl zamítnut (ovládej šipkami / WASD nebo povol senzory v prohlížeči)',
  tiltHintGyro: 'Nakláněj tablet pro kutálení kuličky',
  tiltHintFallback: 'Nakláněj tablet (nebo drž šipky / WASD)',
  tiltCalibrate: 'Vyrovnat',
  tiltCalibrateTitle: 'Nastavit aktuální náklon tabletu jako rovinu',

  ariaCurvedMaze: 'Křivkové bludiště',
  ariaCircularMaze: 'Kruhové bludiště',
  printClassicTitle: 'Bludiště: Start → Cíl',
  printClassicSubtitle: 'Najdi tužkou cestu od startu (S) až do cíle (C).',
  printCollectTitle: (count) =>
    `Bludiště: Od křížku ✕ ke kolečkům ◯ (${count} koleček)`,
  printCollectSubtitle:
    'Začni na křížku ✕ a tužkou posbírej všechna kolečka ◯ na koncích slepých uliček.',
};

const EN: Messages = {
  appTitle: 'Maze',
  switchLanguageLabel: 'Switch language to Czech',
  switchLanguageTitle: 'Přepnout do češtiny',
  languageBadge: 'EN',

  hint: 'Hint',
  hintTitle: 'Show hint',
  start: 'Start',
  startTitle: 'Back to start',
  newMaze: 'New',
  newMazeTitle: 'New maze',
  trailLabel: 'Show trail',
  trailOnTitle: 'Trail on: draws your path',
  trailOffTitle: 'Trail off: path is hidden',
  soundOnTitle: 'Mute sounds',
  soundOffTitle: 'Enable sounds',
  printLabel: 'Print A4',
  printTitle: 'Print a clean black & white maze on A4',
  fullscreenLabel: 'Full screen',
  fullscreenTitle: 'Hide menu and expand maze to full screen (F)',
  helpLabel: 'Controls help',
  helpShowTitle: 'Show controls help',
  helpHideTitle: 'Hide controls help',

  modeLabel: 'Mode:',
  styleLabel: 'Style:',
  generatorLabel: 'Generator:',
  themeLabel: 'Theme:',
  targetCountLabel: 'Targets:',
  allTargets: 'All',
  marble: 'Marble',
  marbleTitle: 'Roll a marble by tilting your tablet (on PC hold arrows / WASD)',
  fog: 'Fog',
  fogTitle: 'Fog of war with flashlight — unexplored corridors stay in darkness',
  bridges: 'Bridges',
  bridgesTitle: 'Over/under bridges — count scales with maze size',
  braided: 'Loops',
  braidedTitle: 'Connects some dead ends into loops (multiple paths)',

  difficulties: {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    huge: 'Huge',
  },
  ringsCount: (n) => `${n} rings`,
  aspects: {
    square: 'Square',
    tablet: 'Tablet',
    widescreen: 'Widescreen',
  },
  aspectTitle: (label, ratio) => `Aspect ratio: ${label} (${ratio})`,
  modes: {
    classic: 'Start → Goal',
    collect: 'Collect All',
  },
  modeTitles: {
    classic: 'Start → Goal',
    collect: 'Collect all targets',
  },
  styles: {
    classic: 'Square',
    curved: 'Curved',
    circular: 'Circular',
  },
  algorithms: {
    backtracker: 'Winding',
    prim: 'Branching',
    kruskal: 'Uniform',
  },
  themes: {
    space: 'Space',
    hologram: 'Hologram',
    forest: 'Forest',
    pirate: 'Treasure',
    paper: 'Paper',
  },
  stories: {
    space: {
      classicSubtitle: 'Guide the rocket through the space maze to the planet!',
      circularSubtitle:
        'Fly the rocket from the edge of the galaxy to the planet at its core!',
      collectSubtitle: 'Launch from ✕ and collect all the glowing stars!',
      winClassicTitle: 'Landed on the planet!',
      winCollectTitle: 'All stars collected!',
      collectLabel: 'Stars',
    },
    hologram: {
      classicSubtitle:
        'Navigate the holographic star chart to the target planet!',
      circularSubtitle:
        'Fly from the radar rim to the target at the center of the star chart!',
      collectSubtitle: 'Start at ✕ and capture all the glowing signals!',
      winClassicTitle: 'Target locked!',
      winCollectTitle: 'All signals captured!',
      collectLabel: 'Signals',
    },
    forest: {
      classicSubtitle: 'Help the fox wind through the forest to the cozy cabin!',
      circularSubtitle:
        'Guide the fox from the forest edge to the cabin at its heart!',
      collectSubtitle: 'Start from ✕ and gather all the forest berries!',
      winClassicTitle: 'The fox reached the cabin!',
      winCollectTitle: 'All berries gathered!',
      collectLabel: 'Berries',
    },
    pirate: {
      classicSubtitle:
        'Sail the pirate ship across the map to the treasure chest!',
      circularSubtitle:
        'Sail from the island coast to the treasure chest at the center!',
      collectSubtitle: 'Set sail from ✕ and collect all the gold coins!',
      winClassicTitle: 'Treasure found!',
      winCollectTitle: 'All coins collected!',
      collectLabel: 'Coins',
    },
    paper: {
      classicSubtitle:
        'Trace a path from the top-left corner to the green goal.',
      circularSubtitle:
        'Find your way from the outer edge of the circular maze to the center.',
      collectSubtitle: 'From ✕ to ◯ — collect every circle in the maze!',
      winClassicTitle: 'Maze solved!',
      winCollectTitle: 'All circles collected!',
      collectLabel: 'Circles',
    },
  },

  helpControls: 'Controls:',
  helpOr: 'or',
  helpDrag: 'drag across the maze',
  helpNewMaze: 'new maze',
  helpFullscreen: 'full screen',

  statTime: 'Time',
  statSteps: 'Steps',
  statOptimum: 'Optimum',

  winTime: 'Time:',
  winSteps: 'Steps:',
  winOptimum: (n) => `(optimum ${n})`,
  winNewMaze: 'New Maze',

  focusMarbleOn: 'Disable marble',
  focusMarbleOff: 'Enable marble (tilt)',
  focusFogOn: 'Disable fog',
  focusFogOff: 'Enable fog with flashlight',
  focusBrowserFullscreenEnter: 'Hide browser toolbars',
  focusBrowserFullscreenExit: 'Exit browser full screen',
  focusMenu: 'Menu',
  focusMenuTitle: 'Show menu (Esc)',
  menuCollapse: 'Hide menu',
  menuExpand: 'Show menu',

  tiltEnable: 'Enable tablet tilt',
  tiltDenied:
    'Motion access was denied (use arrow keys / WASD or enable sensors in browser settings)',
  tiltHintGyro: 'Tilt your tablet to roll the marble',
  tiltHintFallback: 'Tilt your tablet (or hold arrows / WASD)',
  tiltCalibrate: 'Level',
  tiltCalibrateTitle: 'Set current tablet tilt as neutral',

  ariaCurvedMaze: 'Curved maze',
  ariaCircularMaze: 'Circular maze',
  printClassicTitle: 'Maze: Start → Goal',
  printClassicSubtitle:
    'Trace a path with a pencil from the start (S) to the goal (C).',
  printCollectTitle: (count) => `Maze: Collect all (${count} targets)`,
  printCollectSubtitle:
    'Start at the cross ✕ and trace a path to collect every circle ◯.',
};

export const TRANSLATIONS: Record<Language, Messages> = {
  cs: CS,
  en: EN,
};

export function getMessages(language: Language): Messages {
  return TRANSLATIONS[language];
}
