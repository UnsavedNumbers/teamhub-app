/**
 * Organization Theme Configuration (Expanded)
 *
 * Adds derived UI tokens for surfaces, text, borders, buttons, status, and dark mode.
 * Base colors remain unchanged; tokens are derived for consistent, team-style UI.
 */

export interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
  },
  ui: {
    text: { primary: string; secondary: string; muted: string; inverse: string },
    surface: { page: string; section: string; card: string; cardHeader: string; hover: string; active: string },
    border: { default: string; subtle: string; active: string },
    button: {
      primary: { bg: string; text: string; hover: string },
      secondary: { bg: string; text: string; hover: string },
      disabled: { bg: string; text: string }
    },
    status: { success: string; warning: string; error: string; info: string },
    dark: {
      surface: { page: string; card: string; cardHeader: string },
      text: { primary: string; secondary: string },
      border: string
      hover: string
    }
  }
  lightModeOverrides?: { primary?: string; secondary?: string; accent?: string }
  darkModeOverrides?: { primary?: string; secondary?: string; accent?: string },
  status: 'active' | 'hidden'
}

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    colors: {
      primary: '#003A8F',
      secondary: '#B6C9E2',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#003A8F',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DBE3EF',
        hover: '#EEF2F9',
        active: '#E2E9F2'
      },
      border: {
        default: '#C9D2E1',
        subtle: '#DBE2EC',
        active: '#B6C9E2'
      },
      button: {
        primary: {
          bg: '#003A8F',
          text: '#FFFFFF',
          hover: '#003481'
        },
        secondary: {
          bg: '#B6C9E2',
          text: '#111111',
          hover: '#A4B5CB'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#091728',
          card: '#0E2138',
          cardHeader: '#112844'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#213854',
        hover: '#23384F'
      }
    },
    status: 'active'
  },
  {
    id: 'crimson_gold',
    name: 'Crimson Gold',
    colors: {
      primary: '#9E1B32',
      secondary: '#F5C400',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#9E1B32',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#E8E1E7',
        hover: '#F2F2EB',
        active: '#F0E8C1'
      },
      border: {
        default: '#D3D0DB',
        subtle: '#E1E1E8',
        active: '#F5C400'
      },
      button: {
        primary: {
          bg: '#9E1B32',
          text: '#FFFFFF',
          hover: '#8E182D'
        },
        secondary: {
          bg: '#F5C400',
          text: '#111111',
          hover: '#DCB000'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#161521',
          card: '#1D1E2E',
          cardHeader: '#242539'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#2E364D',
        hover: '#273842'
      }
    },
    status: 'active'
  },
  {
    id: 'scarlet_metallic',
    name: 'Scarlet Metallic',
    colors: {
      primary: '#C1121F',
      secondary: '#B7A57A',
      accent: '#111111'
    },
    ui: {
      text: {
        primary: '#C1121F',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#EAE0E6',
        hover: '#EEF0F2',
        active: '#E2E1DC'
      },
      border: {
        default: '#D5D0DA',
        subtle: '#E3E0E8',
        active: '#B7A57A'
      },
      button: {
        primary: {
          bg: '#C1121F',
          text: '#FFFFFF',
          hover: '#AE101C'
        },
        secondary: {
          bg: '#B7A57A',
          text: '#FFFFFF',
          hover: '#A5946E'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#19141F',
          card: '#211D2C',
          cardHeader: '#282437'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#31354B',
        hover: '#233649'
      }
    },
    status: 'active'
  },
  {
    id: 'crimson_slate',
    name: 'Crimson Slate',
    colors: {
      primary: '#7A0019',
      secondary: '#9EA2A2',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#7A0019',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#E5DFE5',
        hover: '#EDF0F5',
        active: '#DCE0E4'
      },
      border: {
        default: '#D0CFDA',
        subtle: '#E0E0E7',
        active: '#9EA2A2'
      },
      button: {
        primary: {
          bg: '#7A0019',
          text: '#FFFFFF',
          hover: '#6E0016'
        },
        secondary: {
          bg: '#9EA2A2',
          text: '#FFFFFF',
          hover: '#8E9292'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#13121F',
          card: '#1A1B2C',
          cardHeader: '#1F2136'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#2B344B',
        hover: '#22364C'
      }
    },
    status: 'active'
  },
  {
    id: 'deep_red_neutral',
    name: 'Deep Red Neutral',
    colors: {
      primary: '#8B1E1E',
      secondary: '#E5E5E5',
      accent: '#111111'
    },
    ui: {
      text: {
        primary: '#8B1E1E',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#E6E1E6',
        hover: '#F1F4F9',
        active: '#ECEFF3'
      },
      border: {
        default: '#D2D1DA',
        subtle: '#E0E1E8',
        active: '#E5E5E5'
      },
      button: {
        primary: {
          bg: '#8B1E1E',
          text: '#FFFFFF',
          hover: '#7D1B1B'
        },
        secondary: {
          bg: '#E5E5E5',
          text: '#111111',
          hover: '#C5C5C5'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#14151F',
          card: '#1B1E2C',
          cardHeader: '#212537'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#2C364B',
        hover: '#263A50'
      }
    },
    status: 'active'
  },
  {
    id: 'navy_gold_classic',
    name: 'Navy Gold Classic',
    colors: {
      primary: '#0B1C2D',
      secondary: '#D4AF37',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#0B1C2D',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE1E7',
        hover: '#F0F1EE',
        active: '#E8E3CD'
      },
      border: {
        default: '#CAD0DB',
        subtle: '#DBE1E8',
        active: '#D4AF37'
      },
      button: {
        primary: {
          bg: '#0B1C2D',
          text: '#FFFFFF',
          hover: '#0A1928'
        },
        secondary: {
          bg: '#D4AF37',
          text: '#FFFFFF',
          hover: '#BF9E32'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0A1520',
          card: '#0F1E2E',
          cardHeader: '#122538'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#22364C',
        hover: '#253745'
      }
    },
    status: 'active'
  },
  {
    id: 'midnight_gold',
    name: 'Midnight Gold',
    colors: {
      primary: '#0A2342',
      secondary: '#F2C94C',
      accent: '#111111'
    },
    ui: {
      text: {
        primary: '#0A2342',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE1E9',
        hover: '#F2F2F0',
        active: '#EFE9D1'
      },
      border: {
        default: '#CAD1DC',
        subtle: '#DBE1E9',
        active: '#F2C94C'
      },
      button: {
        primary: {
          bg: '#0A2342',
          text: '#FFFFFF',
          hover: '#09203B'
        },
        secondary: {
          bg: '#F2C94C',
          text: '#111111',
          hover: '#D0AD41'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0A1522',
          card: '#0E1E30',
          cardHeader: '#12263B'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#22364E',
        hover: '#273846'
      }
    },
    status: 'active'
  },
  {
    id: 'royal_burnt',
    name: 'Royal Burnt',
    colors: {
      primary: '#0D47A1',
      secondary: '#EF6C00',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#0D47A1',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE4F0',
        hover: '#F2EDEB',
        active: '#EED5C1'
      },
      border: {
        default: '#CAD3E2',
        subtle: '#DBE3ED',
        active: '#EF6C00'
      },
      button: {
        primary: {
          bg: '#0D47A1',
          text: '#FFFFFF',
          hover: '#0C4091'
        },
        secondary: {
          bg: '#EF6C00',
          text: '#FFFFFF',
          hover: '#D76100'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0A1829',
          card: '#0F223A',
          cardHeader: '#122A46'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#223956',
        hover: '#273342'
      }
    },
    status: 'active'
  },
  {
    id: 'deep_blue_copper',
    name: 'Deep Blue Copper',
    colors: {
      primary: '#002855',
      secondary: '#C46B3C',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#002855',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DBE2EA',
        hover: '#EFEDEF',
        active: '#E5D4CE'
      },
      border: {
        default: '#C9D1DD',
        subtle: '#DBE1EA',
        active: '#C46B3C'
      },
      button: {
        primary: {
          bg: '#002855',
          text: '#FFFFFF',
          hover: '#00244C'
        },
        secondary: {
          bg: '#C46B3C',
          text: '#FFFFFF',
          hover: '#B06036'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#091623',
          card: '#0E1F32',
          cardHeader: '#11263D'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#21374F',
        hover: '#243345'
      }
    },
    status: 'active'
  },
  {
    id: 'true_blue',
    name: 'True Blue',
    colors: {
      primary: '#003A8F',
      secondary: '#E5E5E5',
      accent: '#111111'
    },
    ui: {
      text: {
        primary: '#003A8F',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DBE3EF',
        hover: '#F1F4F9',
        active: '#ECEFF3'
      },
      border: {
        default: '#C9D2E1',
        subtle: '#DBE2EC',
        active: '#E5E5E5'
      },
      button: {
        primary: {
          bg: '#003A8F',
          text: '#FFFFFF',
          hover: '#003481'
        },
        secondary: {
          bg: '#E5E5E5',
          text: '#111111',
          hover: '#C5C5C5'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#091728',
          card: '#0E2138',
          cardHeader: '#112844'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#213854',
        hover: '#263A50'
      }
    },
    status: 'active'
  },
  {
    id: 'steel_blue_contrast',
    name: 'Steel Blue',
    colors: {
      primary: '#1F4E79',
      secondary: '#B0BEC5',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#1F4E79',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DDE5ED',
        hover: '#EEF2F7',
        active: '#E0E7EC'
      },
      border: {
        default: '#CBD3DF',
        subtle: '#DCE3EB',
        active: '#B0BEC5'
      },
      button: {
        primary: {
          bg: '#1F4E79',
          text: '#FFFFFF',
          hover: '#1C466D'
        },
        secondary: {
          bg: '#B0BEC5',
          text: '#FFFFFF',
          hover: '#9EABB1'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0C1926',
          card: '#112336',
          cardHeader: '#142B42'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#243A52',
        hover: '#23384E'
      }
    },
    status: 'active'
  },
  {
    id: 'forest_gold',
    name: 'Forest Gold',
    colors: {
      primary: '#1B5E20',
      secondary: '#F9A825',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#1B5E20',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DDE6E6',
        hover: '#F2F0ED',
        active: '#F0E2C9'
      },
      border: {
        default: '#CBD4DA',
        subtle: '#DCE3E8',
        active: '#F9A825'
      },
      button: {
        primary: {
          bg: '#1B5E20',
          text: '#FFFFFF',
          hover: '#18551D'
        },
        secondary: {
          bg: '#F9A825',
          text: '#FFFFFF',
          hover: '#E09721'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0B1A1F',
          card: '#10242D',
          cardHeader: '#142D37'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#233B4B',
        hover: '#273644'
      }
    },
    status: 'active'
  },
  {
    id: 'dark_green_athletic',
    name: 'Dark Green Athletic',
    colors: {
      primary: '#0B3D2E',
      secondary: '#C9A227',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#0B3D2E',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE4E7',
        hover: '#F0F0ED',
        active: '#E6E0C9'
      },
      border: {
        default: '#CAD2DB',
        subtle: '#DBE2E8',
        active: '#C9A227'
      },
      button: {
        primary: {
          bg: '#0B3D2E',
          text: '#FFFFFF',
          hover: '#0A3729'
        },
        secondary: {
          bg: '#C9A227',
          text: '#FFFFFF',
          hover: '#B59223'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0A1720',
          card: '#0F212E',
          cardHeader: '#122939'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#22384C',
        hover: '#243644'
      }
    },
    status: 'active'
  },
  {
    id: 'spartan_green',
    name: 'Spartan Green',
    colors: {
      primary: '#18453B',
      secondary: '#FFFFFF',
      accent: '#111111'
    },
    ui: {
      text: {
        primary: '#18453B',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DDE4E8',
        hover: '#F3F6FA',
        active: '#F2F5F9'
      },
      border: {
        default: '#CBD3DC',
        subtle: '#DCE2E9',
        active: '#FFFFFF'
      },
      button: {
        primary: {
          bg: '#18453B',
          text: '#FFFFFF',
          hover: '#163E35'
        },
        secondary: {
          bg: '#FFFFFF',
          text: '#111111',
          hover: '#DBDBDB'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0B1821',
          card: '#10222F',
          cardHeader: '#142A3A'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#23394D',
        hover: '#283B51'
      }
    },
    status: 'active'
  },
  {
    id: 'field_black',
    name: 'Field Black',
    colors: {
      primary: '#1E4D2B',
      secondary: '#111111',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#1E4D2B',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE0E5',
        hover: '#E4E7EC',
        active: '#BDC1C4'
      },
      border: {
        default: '#CAD0D9',
        subtle: '#DCE0E7',
        active: '#111111'
      },
      button: {
        primary: {
          bg: '#1E4D2B',
          text: '#FFFFFF',
          hover: '#1B4527'
        },
        secondary: {
          bg: '#111111',
          text: '#FFFFFF',
          hover: '#0F0F0F'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0C1920',
          card: '#10232E',
          cardHeader: '#142B38'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#243A4C',
        hover: '#192D43'
      }
    },
    status: 'active'
  },
  {
    id: 'royal_gold',
    name: 'Royal Gold',
    colors: {
      primary: '#4A148C',
      secondary: '#FBC02D',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#4A148C',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#E1E0EE',
        hover: '#F3F2EE',
        active: '#F1E7CB'
      },
      border: {
        default: '#CED0E1',
        subtle: '#DEE0EC',
        active: '#FBC02D'
      },
      button: {
        primary: {
          bg: '#4A148C',
          text: '#FFFFFF',
          hover: '#43127E'
        },
        secondary: {
          bg: '#FBC02D',
          text: '#111111',
          hover: '#E2AD28'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0F1428',
          card: '#151D37',
          cardHeader: '#1A2444'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#273554',
        hover: '#283844'
      }
    },
    status: 'active'
  },
  {
    id: 'deep_purple_classic',
    name: 'Deep Purple Classic',
    colors: {
      primary: '#3A0F6F',
      secondary: '#C9A227',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#3A0F6F',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#E0E0EC',
        hover: '#F0F0ED',
        active: '#E6E0C9'
      },
      border: {
        default: '#CDD0DF',
        subtle: '#DDE0EB',
        active: '#C9A227'
      },
      button: {
        primary: {
          bg: '#3A0F6F',
          text: '#FFFFFF',
          hover: '#340E64'
        },
        secondary: {
          bg: '#C9A227',
          text: '#FFFFFF',
          hover: '#B59223'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0E1425',
          card: '#131C34',
          cardHeader: '#182340'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#263552',
        hover: '#243644'
      }
    },
    status: 'active'
  },
  {
    id: 'burnt_navy',
    name: 'Burnt Navy',
    colors: {
      primary: '#BF360C',
      secondary: '#0D1B2A',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#BF360C',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE1E7',
        hover: '#E4E8EE',
        active: '#BDC3CA'
      },
      border: {
        default: '#CAD0DB',
        subtle: '#DBE1E8',
        active: '#0D1B2A'
      },
      button: {
        primary: {
          bg: '#BF360C',
          text: '#FFFFFF',
          hover: '#AC310B'
        },
        secondary: {
          bg: '#0D1B2A',
          text: '#FFFFFF',
          hover: '#0C1826'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#18171D',
          card: '#21202B',
          cardHeader: '#282834'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#30384A',
        hover: '#192E44'
      }
    },
    status: 'active'
  },
  {
    id: 'bright_navy',
    name: 'Bright Navy',
    colors: {
      primary: '#EF6C00',
      secondary: '#1F3A5F',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#EF6C00',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DDE3EB',
        hover: '#E5EAF1',
        active: '#C0CAD6'
      },
      border: {
        default: '#CBD2DE',
        subtle: '#DCE2EA',
        active: '#1F3A5F'
      },
      button: {
        primary: {
          bg: '#EF6C00',
          text: '#FFFFFF',
          hover: '#D76100'
        },
        secondary: {
          bg: '#1F3A5F',
          text: '#FFFFFF',
          hover: '#1C3456'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#1C1B1D',
          card: '#252629',
          cardHeader: '#2D2E33'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#343C49',
        hover: '#1A3048'
      }
    },
    status: 'active'
  },
  {
    id: 'black_cardinal',
    name: 'Black Cardinal',
    colors: {
      primary: '#111111',
      secondary: '#8C1D18',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#111111',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DCE0E5',
        hover: '#ECE8EC',
        active: '#D8C3C6'
      },
      border: {
        default: '#CAD0D9',
        subtle: '#DCE0E7',
        active: '#8C1D18'
      },
      button: {
        primary: {
          bg: '#111111',
          text: '#FFFFFF',
          hover: '#0F0F0F'
        },
        secondary: {
          bg: '#8C1D18',
          text: '#FFFFFF',
          hover: '#7E1A16'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0B141E',
          card: '#0F1D2B',
          cardHeader: '#132335'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#22354A',
        hover: '#212E43'
      }
    },
    status: 'active'
  },
  {
    id: 'charcoal_scarlet',
    name: 'Charcoal Scarlet',
    colors: {
      primary: '#1F2933',
      secondary: '#C1121F',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#1F2933',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DDE2E7',
        hover: '#EFE7ED',
        active: '#E4C1C7'
      },
      border: {
        default: '#CBD1DB',
        subtle: '#DCE1E8',
        active: '#C1121F'
      },
      button: {
        primary: {
          bg: '#1F2933',
          text: '#FFFFFF',
          hover: '#1C252E'
        },
        secondary: {
          bg: '#C1121F',
          text: '#FFFFFF',
          hover: '#AE101C'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#0C1621',
          card: '#111F2E',
          cardHeader: '#142639'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#24374D',
        hover: '#242D44'
      }
    },
    status: 'active'
  },
  {
    id: 'teal_sunrise',
    name: 'Teal Sunrise',
    colors: {
      primary: '#005F73',
      secondary: '#F4A261',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#005F73',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DBE6EC',
        hover: '#F2F0F1',
        active: '#EFE0D6'
      },
      border: {
        default: '#C9D4DF',
        subtle: '#DBE3EB',
        active: '#F4A261'
      },
      button: {
        primary: {
          bg: '#005F73',
          text: '#FFFFFF',
          hover: '#005668'
        },
        secondary: {
          bg: '#F4A261',
          text: '#FFFFFF',
          hover: '#DC9257'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#091A26',
          card: '#0E2435',
          cardHeader: '#112D41'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#213B52',
        hover: '#273648'
      }
    },
    status: 'active'
  },
  {
    id: 'teal_gold',
    name: 'Teal Gold',
    colors: {
      primary: '#006064',
      secondary: '#D4AF37',
      accent: '#FFFFFF'
    },
    ui: {
      text: {
        primary: '#006064',
        secondary: '#5C6773',
        muted: '#8A94A6',
        inverse: '#FFFFFF'
      },
      surface: {
        page: '#F7F9FC',
        section: '#EEF2F7',
        card: '#FFFFFF',
        cardHeader: '#DBE6EB',
        hover: '#F0F1EE',
        active: '#E8E3CD'
      },
      border: {
        default: '#C9D5DE',
        subtle: '#DBE4EA',
        active: '#D4AF37'
      },
      button: {
        primary: {
          bg: '#006064',
          text: '#FFFFFF',
          hover: '#00565A'
        },
        secondary: {
          bg: '#D4AF37',
          text: '#FFFFFF',
          hover: '#BF9E32'
        },
        disabled: {
          bg: '#E1E6ED',
          text: '#9AA4B2'
        }
      },
      status: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
        info: '#1565C0'
      },
      dark: {
        surface: {
          page: '#091A25',
          card: '#0E2533',
          cardHeader: '#112D3F'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B6C2D1'
        },
        border: '#213B51',
        hover: '#253745'
      }
    },
    status: 'active'
  }
]

export function getActiveThemes(): Theme[] {
  return THEMES.filter(theme => theme.status === 'active')
}

export function getDefaultTheme(): Theme {
  const defaultTheme = THEMES.find(theme => theme.id === 'default')
  if (defaultTheme) return defaultTheme
  const firstActive = THEMES.find(theme => theme.status === 'active')
  if (firstActive) return firstActive
  return THEMES[0]
}

export function getTheme(themeId: string | null): Theme {
  if (!themeId) return getDefaultTheme()
  const theme = THEMES.find(t => t.id === themeId)
  if (!theme) {
    console.warn(`Theme "${themeId}" not found, using default`)
    return getDefaultTheme()
  }
  return theme
}