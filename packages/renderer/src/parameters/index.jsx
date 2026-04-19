import TextControl from "./TextControl.jsx";
import TextareaControl from "./TextareaControl.jsx";
import DateTimeControl from "./DateTimeControl.jsx";
import FileControl from "./FileControl.jsx";
import ImageControl from "./ImageControl.jsx";
import MultiImageControl from "./MultiImageControl.jsx";
import { getAdaptedComponent, pickAdaptedComponent } from "../adapters/registry.js";

// Built-in fallback: используется если адаптер не зарегистрирован или
// конкретного control type в нём нет. В последнем случае падаем на
// TextControl как универсальный fallback.
const CONTROLS_BY_TYPE = {
  text: TextControl,
  email: TextControl,
  tel: TextControl,
  url: TextControl,
  number: TextControl,
  textarea: TextareaControl,
  datetime: DateTimeControl,
  file: FileControl,
  image: ImageControl,
  multiImage: MultiImageControl,
};

export default function ParameterControl({ spec, value, onChange, error }) {
  // Сначала пробуем UI-адаптер через matching-score (§17 адаптивный слой).
  // pickAdaptedComponent учитывает spec.fieldRole, spec.name, spec.features
  // через affinity декларации адаптеров — например text+fieldRole:"price"
  // автоматически выбирает number-компонент с ₽-префиксом.
  // Fallback: exact lookup по spec.control (back-compat), потом built-in.
  const Picked = pickAdaptedComponent("parameter", spec);
  const Adapted = Picked || getAdaptedComponent("parameter", spec.control);
  if (Adapted) {
    return <Adapted spec={spec} value={value} onChange={onChange} error={error} />;
  }
  const Component = CONTROLS_BY_TYPE[spec.control] || TextControl;
  return <Component spec={spec} value={value} onChange={onChange} error={error} />;
}
