// The funding theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in funding.settings.json and the generated funding.settings.ts;
// change them with `astryx experimental theme editor set funding ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {fundingSettings} from './funding.settings';

export const fundingTheme = defineTheme({
  extends: fundingSettings,
  name: 'funding',
});
