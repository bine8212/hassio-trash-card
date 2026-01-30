/* eslint-disable @typescript-eslint/unbound-method */
import { assert } from 'superstruct';
import { computeDarkMode } from '../../utils/computeDarkMode';
import memoizeOne from 'memoize-one';
import setupCustomlocalize from '../../localize';
import { TRASH_CARD_EDITOR_NAME } from './const';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { entityCardConfigStruct } from './trash-card-config';
import { getPatternOthersSchema, getPatternSchema, getCalendarSettingsSchema, getSchema } from './formSchemas';
import { fireEvent } from '../../utils/fireEvent';

import './trash-card-pattern-editor';
import './trash-card-calendar-settings-editor';

import type { TrashCardConfig } from './trash-card-config';
import type { CSSResultGroup, PropertyValues } from 'lit';
import type { HomeAssistant } from '../../utils/ha';
import type { SubElementEditorConfig } from './trash-card-pattern-editor';
import type { CalendarSettingsSubElementEditorConfig } from './trash-card-calendar-settings-editor';
import type { HaFormSchema } from '../../utils/form/ha-form';

interface DomEvent<T> extends Event {
  detail: T;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface HASSDomEvents {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'config-changed': {
      config: TrashCardConfig;
    };
  }
}

const configDefaults = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  event_grouping: true,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  drop_todayevents_from: '10:00:00',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  next_days: 2,
  pattern: [
    {
      icon: 'mdi:flower',
      color: 'lime',
      type: 'organic'
    },
    {
      icon: 'mdi:newspaper',
      color: 'blue',
      type: 'paper'
    },
    {
      icon: 'mdi:recycle-variant',
      color: 'amber',
      type: 'recycle'
    },
    {
      icon: 'mdi:trash-can-outline',
      color: 'grey',
      type: 'waste'
    },
    {
      icon: 'mdi:dump-truck',
      color: 'purple',
      type: 'others'
    }
  ],
  // eslint-disable-next-line @typescript-eslint/naming-convention
  day_style: 'default',
  day_style_format: 'yyyy.MM.dd',
  card_style: 'card',
  alignment_style: 'left',
  color_mode: 'background',
  items_per_row: 1,
  refresh_rate: 60,
  with_label: true,
  layout: 'default'
};

@customElement(TRASH_CARD_EDITOR_NAME)
class TrashCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private config?: TrashCardConfig;

  @state() private subElementEditorConfig?: SubElementEditorConfig | CalendarSettingsSubElementEditorConfig;

  @state() private readonly schema = memoizeOne(getSchema);

  public setConfig (config: Partial<TrashCardConfig>): void {
    assert(config, entityCardConfigStruct);

    this.config = {
      ...configDefaults,
      ...config
    } as TrashCardConfig;
  }

  protected updated (changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.hass) {
      const currentDarkMode = computeDarkMode(changedProps.get('hass'));
      const newDarkMode = computeDarkMode(this.hass);

      if (currentDarkMode !== newDarkMode) {
        this.toggleAttribute('dark-mode', newDarkMode);
      }
    }
  }

  private readonly computeLabel = (schema: HaFormSchema) => {
    if (!this.hass) {
      return schema.label;
    }

    return schema.label ?? '';
  };

  private readonly computeHelper = (schema: HaFormSchema) => {
    if (!this.hass) {
      return schema.name;
    }

    return schema.helper ?? '';
  };

  private renderFormPatternsEditor () {
    if (!this.hass) {
      return nothing;
    }

    const customLocalize = setupCustomlocalize(this.hass);

    if (this.subElementEditorConfig) {
      // Check if it's a calendar settings editor config
      const isCalendarSettings = 'elementConfig' in this.subElementEditorConfig && 
        this.subElementEditorConfig.elementConfig && 
        'entity' in this.subElementEditorConfig.elementConfig &&
        !('pattern' in this.subElementEditorConfig.elementConfig);

      if (isCalendarSettings) {
        const calendarSettingsSchema = getCalendarSettingsSchema(customLocalize, this.hass.localize);

        return html`
          <div class="header" id="trashcard-calendar-settings-editor">
            <div class="back-title">
                <ha-icon-button
                    .label=${this.hass.localize('ui.common.back')}
                    @click=${this.goBack}
                >
                  <ha-icon icon="mdi:arrow-left"></ha-icon>
                </ha-icon-button>
                <span slot="title">${customLocalize(`editor.card.trash.calendar_settings.title`)}</span>
            </div>
          </div>
            <ha-form
                .hass=${this.hass}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                .data=${this.subElementEditorConfig.elementConfig}
                .schema=${calendarSettingsSchema}
                @value-changed=${this.handleCalendarSettingsSubElementChanged}
            >
            </ha-form>
        `;
      }

      const patternSchema = this.subElementEditorConfig.elementConfig?.type === 'others' ?
        getPatternOthersSchema(this.hass.localize) :
        getPatternSchema(customLocalize, this.hass.localize);

      return html`
        <div class="header" id="trashcard-pattern-editor">
          <div class="back-title">
              <ha-icon-button
                  .label=${this.hass.localize('ui.common.back')}
                  @click=${this.goBack}
              >
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </ha-icon-button>
              <span slot="title">${customLocalize(`editor.card.trash.pattern.title`)}</span>
          </div>
        </div>
          <ha-form
              .hass=${this.hass}
              .computeLabel=${this.computeLabel}
              .computeHelper=${this.computeHelper}
              .data=${this.subElementEditorConfig.elementConfig}
              .schema=${patternSchema}
              @value-changed=${this.handleSubElementChanged}
          >
          </ha-form>
      `;
    }

    return html`
      <trash-card-pattern-editor
        .hass=${this.hass}
          .pattern=${this.config!.pattern}
          @delete-pattern-item=${this.deletePatternItem}  
          @create-pattern-item=${this.createPatternItem}  
          @edit-pattern-item=${this.editPatternItem}
          @settings-changed=${this.valueChanged}
      ></trash-card-pattern-editor>`;
  }

  private isCalendarSettingsSubEditor (): boolean {
    return Boolean(
      this.subElementEditorConfig?.elementConfig &&
      'entity' in this.subElementEditorConfig.elementConfig &&
      !('pattern' in this.subElementEditorConfig.elementConfig)
    );
  }

  private renderFormCalendarSettingsEditor () {
    if (!this.hass) {
      return nothing;
    }

    const customLocalize = setupCustomlocalize(this.hass);

    // Only show calendar settings form when we're actually editing a calendar setting (not a pattern)
    if (this.subElementEditorConfig && this.isCalendarSettingsSubEditor()) {
      const calendarSettingsSchema = getCalendarSettingsSchema(customLocalize, this.hass.localize);

      return html`
        <div class="header" id="trashcard-calendar-settings-editor">
          <div class="back-title">
              <ha-icon-button
                  .label=${this.hass.localize('ui.common.back')}
                  @click=${this.goBack}
              >
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </ha-icon-button>
              <span slot="title">${customLocalize(`editor.card.trash.calendar_settings.title`)}</span>
          </div>
        </div>
          <ha-form
              .hass=${this.hass}
              .computeLabel=${this.computeLabel}
              .computeHelper=${this.computeHelper}
              .data=${this.subElementEditorConfig.elementConfig}
              .schema=${calendarSettingsSchema}
              @value-changed=${this.handleCalendarSettingsSubElementChanged}
          >
          </ha-form>
      `;
    }

    return html`
      <trash-card-calendar-settings-editor
        .hass=${this.hass}
          .calendar_settings=${this.config!.calendar_settings}
          @delete-calendar-settings-item=${this.deleteCalendarSettingsItem}  
          @create-calendar-settings-item=${this.createCalendarSettingsItem}  
          @edit-calendar-settings-item=${this.editCalendarSettingsItem}
          @settings-changed=${this.valueChanged}
      ></trash-card-calendar-settings-editor>`;
  }

  private goBack (): void {
    this.subElementEditorConfig = undefined;
  }

  private handleSubElementChanged (ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass || !this.subElementEditorConfig) {
      return;
    }

    const item = this.subElementEditorConfig.key!;

    const { value } = ev.detail;

    const config = {
      ...this.config,
      pattern: [
        ...this.config.pattern ?? []
      ]
    };

    config.pattern[item] = value;

    this.subElementEditorConfig = {
      ...this.subElementEditorConfig,
      elementConfig: value
    };

    fireEvent(this, 'config-changed', { config });
  }

  private handleCalendarSettingsSubElementChanged (ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass || !this.subElementEditorConfig) {
      return;
    }

    const item = this.subElementEditorConfig.key!;

    const { value } = ev.detail;

    const config = {
      ...this.config,
      calendar_settings: [
        ...this.config.calendar_settings ?? []
      ]
    };

    config.calendar_settings[item] = value;

    this.subElementEditorConfig = {
      ...this.subElementEditorConfig,
      elementConfig: value
    };

    fireEvent(this, 'config-changed', { config });
  }

  private editPatternItem (ev: DomEvent<{ subElementConfig: SubElementEditorConfig }>): void {
    this.subElementEditorConfig = ev.detail.subElementConfig;
  }

  // eslint-disable-next-line class-methods-use-this
  protected createPatternItem (ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass) {
      return;
    }

    const customLocalize = setupCustomlocalize(this.hass);

    const config = {
      ...this.config,
      pattern: [
        ...this.config.pattern ?? []
      ]
    };

    const newIdx = config.
      pattern.
      filter(pat => pat.type === 'custom').
      length + 1;

    config.pattern.push({
      label: `${customLocalize('editor.card.trash.pattern.new_custom_label')} ${newIdx}`,
      icon: 'mdi:calendar',
      color: 'pink',
      type: 'custom'
    });

    fireEvent(this, 'config-changed', { config });
  }

  protected deletePatternItem (ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass) {
      return;
    }

    const config = {
      ...this.config,
      pattern: [
        ...this.config.pattern ?? []
      ]
    };

    config.pattern.splice(ev.detail.index, 1);

    fireEvent(this, 'config-changed', { config });
  }

  private editCalendarSettingsItem (ev: DomEvent<{ subElementConfig: CalendarSettingsSubElementEditorConfig }>): void {
    this.subElementEditorConfig = ev.detail.subElementConfig;
  }

  // eslint-disable-next-line class-methods-use-this
  protected createCalendarSettingsItem (ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass) {
      return;
    }

    const config = {
      ...this.config,
      calendar_settings: [
        ...this.config.calendar_settings ?? []
      ]
    };

    config.calendar_settings.push({
      entity: '',
      icon: 'mdi:calendar',
      color: 'blue',
      type: 'others'
    });

    fireEvent(this, 'config-changed', { config });
  }

  protected deleteCalendarSettingsItem (ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass) {
      return;
    }

    const config = {
      ...this.config,
      calendar_settings: [
        ...this.config.calendar_settings ?? []
      ]
    };

    config.calendar_settings.splice(ev.detail.index, 1);

    fireEvent(this, 'config-changed', { config });
  }

  protected render () {
    if (!this.hass || !this.config) {
      return nothing;
    }
    const customLocalize = setupCustomlocalize(this.hass);

    const schema = this.schema(customLocalize, this.config, this.hass.localize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${schema}
        .computeLabel=${this.computeLabel}
        .computeHelper=${this.computeHelper}
        @value-changed=${this.valueChanged}
      ></ha-form>
      <ha-expansion-panel id="pattern-expansion-panel" outlined >
        <div slot="header" role="heading" aria-level="3" >
          <ha-icon icon="mdi:image-filter-center-focus">
          </ha-icon>
          ${customLocalize('editor.form.tabs.patterns')}
        </div>
        <div class="content">
          ${this.renderFormPatternsEditor()}
        </div>
      </ha-expansion-panel>

      <ha-expansion-panel id="calendar-settings-expansion-panel" outlined >
        <div slot="header" role="heading" aria-level="3" >
          <ha-icon icon="mdi:calendar-cog">
          </ha-icon>
          ${customLocalize('editor.form.tabs.calendar_settings')}
        </div>
        <div class="content">
          ${this.renderFormCalendarSettingsEditor()}
        </div>
      </ha-expansion-panel>

    `;
  }

  protected valueChanged (ev: CustomEvent): void {
    const config = { ...ev.detail.value };

    if (config.color_mode === 'background') {
      delete config.color_mode;
    }

    if (config.day_style === 'default') {
      delete config.day_style;
    }
    if (config.day_style !== 'custom') {
      delete config.day_style_format;
    }

    if (config.card_style === 'card') {
      delete config.card_style;
    }

    if (config.layout === 'default') {
      delete config.layout;
    }

    fireEvent(this, 'config-changed', { config });
  }

  public static get styles (): CSSResultGroup {
    return [
      css`
        #trashcard-pattern-editor header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        #trashcard-pattern-editor .back-title {
            display: flex;
            align-items: center;
            font-size: 18px;
        }

        #trashcard-pattern-editor ha-icon {
             display: flex;
             align-items: center;
             justify-content: center;
         }

        #pattern-expansion-panel {
          margin-top: 24px;
          display: flex !important;
          flex-direction: column;
        }

        #pattern-expansion-panel ha-form {
          display: block;
        }

        #pattern-expansion-panel .content {
          padding: 12px;
        }

        #pattern-expansion-panel,
        #calendar-settings-expansion-panel {
          display: block;
          --expansion-panel-content-padding: 0;
          border-radius: 6px;
          --ha-card-border-radius: 6px;
          margin-top: 24px;
        }
        #ha-expansion-panel ha-svg-icon,
        #ha-expansion-panel ha-icon {
          color: var(--secondary-text-color);
        }
      `
    ];
  }
}

export {
  TrashCardEditor
};
