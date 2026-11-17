import {h} from './dom.js';
import {icon} from './icons.js';
/** Explicit, individually removable selections, shared by library and events. */
export function renderFilterChips(container, selections, onRemove, onClear) {
  const focused = document.activeElement?.dataset?.filterKey;
  container.hidden = selections.length === 0;
  container.replaceChildren(...selections.map(({key,label}) => h('button', {
    type:'button',class:'filter-chip','data-filter-key':key,'aria-label':`Remove filter: ${label}`,
    on:{click:()=>onRemove(key)},
  },label,icon('close'))), ...(selections.length ? [h('button',{
    type:'button',class:'filter-clear','data-filter-key':'clear',on:{click:onClear},
  },'Clear all')] : []));
  if (focused && !container.querySelector(`[data-filter-key="${CSS.escape(focused)}"]`)) {
    (container.querySelector('button') || document.querySelector('input[type="search"]'))?.focus();
  } else if (focused) container.querySelector(`[data-filter-key="${CSS.escape(focused)}"]`)?.focus();
}
