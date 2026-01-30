/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-return-assign */
import { guard } from 'lit/directives/guard.js';
import setupCustomlocalize from '../../localize';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent } from '../../utils/fireEvent';

import type { TrashCardConfig, CalendarSettings } from './trash-card-config';
import type { CSSResultGroup, PropertyValues } from 'lit';
import type { HomeAssistant } from '../../utils/ha';

interface SubElementEditorConfig {
  index?: number;
  key?: string;
  elementConfig?: CalendarSettings;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface HASSDomEvents {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'edit-calendar-settings-item': {
      subElementConfig: SubElementEditorConfig;
    };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'delete-calendar-settings-item': {
      index: number;
    };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'create-calendar-settings-item': {
      index: number;
    };
  }
}

@customElement(`trash-card-calendar-settings-editor`)
class TrashCardCalendarSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() protected calendar_settings?: TrashCardConfig['calendar_settings'];

  @state() private attached = false;

  public connectedCallback () {
    super.connectedCallback();
    this.attached = true;
  }

  public disconnectedCallback () {
    super.disconnectedCallback();
    this.attached = false;
  }

  protected updated (changedProps: PropertyValues): void {
    super.updated(changedProps);

    const attachedChanged = changedProps.has('attached');
    const calendarSettingsChanged = changedProps.has('calendar_settings');

    if (!calendarSettingsChanged && !attachedChanged) {
      return;
    }

    if (calendarSettingsChanged) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.handleSettingsChanged();
    }
  }

  private async handleSettingsChanged () {
    await this.updateComplete;
  }

  protected render () {
    if (!this.hass) {
      return nothing;
    }

    const customLocalize = setupCustomlocalize(this.hass);

    return html`
      <div class="settings">
      ${guard([ this.calendar_settings ],
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    () => (this.calendar_settings ?? []).map((settingsConfig, index) =>
      html`
          <div class="setting">
            <div class="icon">
              <ha-icon icon="${settingsConfig.icon ?? 'mdi:calendar'}"></ha-icon>
            </div>

            <div class="special-row">
              <div>
                <span>${settingsConfig.entity}</span>
                ${settingsConfig.label ? html`<span class="secondary">${settingsConfig.label}</span>` : nothing}
              </div>
            </div>

            <ha-icon-button
              .label=${customLocalize('editor.card.trash.calendar_settings.edit')}
              class="edit-icon"
              .index=${index}
              @click=${this.editItem}
              >
              <ha-icon icon="mdi:pencil"></ha-icon>
            </ha-icon-button>
            <ha-icon-button
              .label=${customLocalize('editor.card.trash.calendar_settings.delete')}
              class="delete-icon"
              .index=${index}
              @click=${this.deleteItem}
              >
              <ha-icon icon="mdi:close"></ha-icon>
            </ha-icon-button>
          </div>`))}

        <mwc-button
          @click=${this.createItem}
          class="gui-mode-button"
        >${customLocalize('editor.card.trash.calendar_settings.create')}</mwc-button>
    </div>`;
  }

  private editItem (ev: CustomEvent): void {
    const { index } = (ev.currentTarget as any);

    fireEvent(this, 'edit-calendar-settings-item', {
      subElementConfig: {
        index,
        key: index,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        elementConfig: this.calendar_settings![index]
      }
    });
  }

  private deleteItem (ev: CustomEvent): void {
    const { index } = (ev.currentTarget as any);

    fireEvent(this, 'delete-calendar-settings-item', {
      index
    });
  }

  private createItem (ev: CustomEvent): void {
    const { index } = (ev.currentTarget as any);

    fireEvent(this, 'create-calendar-settings-item', {
      index
    });
  }

  public static get styles (): CSSResultGroup {
    return [
      css`
        .settings {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            grid-gap: var(--spacing);
        }

        .setting {
            display: flex;
            align-items: center;
        }

        ha-icon {
            display: flex;
        }

        .setting .icon {
            padding-right: 8px;
            cursor: move;
        }

        .setting .icon > * {
            pointer-events: none;
        }

        .special-row {
            height: 60px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-grow: 1;
        }

        .special-row div {
            display: flex;
            flex-direction: column;
        }

        .remove-icon,
        .edit-icon {
            --mdc-icon-button-size: 36px;
            color: var(--secondary-text-color);
        }

        .secondary {
            font-size: 12px;
            color: var(--secondary-text-color);
        }
        `
    ];
  }
}

export {
  TrashCardCalendarSettingsEditor
};

export type {
  SubElementEditorConfig as CalendarSettingsSubElementEditorConfig
};
