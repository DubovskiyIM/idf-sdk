import BulkWizard from "./BulkWizard.jsx";
import Composer from "./Composer.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import FormModal from "./FormModal.jsx";
import HeroCreate from "./HeroCreate.jsx";
import InlineSearch from "./InlineSearch.jsx";
import IntentButton from "./IntentButton.jsx";
import Overflow from "./Overflow.jsx";
import OverlayManager from "./OverlayManager.jsx";
import SubCollectionAdd from "./SubCollectionAdd.jsx";
import Toggle from "./Toggle.jsx";

/**
 * CONTROLS — map-by-key для SlotRenderer (обратная совместимость).
 */
export const CONTROLS = {
  intentButton: IntentButton,
  composer: Composer,
  overflow: Overflow,
  toggle: Toggle,
  inlineSearch: InlineSearch,
  heroCreate: HeroCreate,
  bulkWizard: BulkWizard,
  confirmDialog: ConfirmDialog,
  formModal: FormModal,
  overlayManager: OverlayManager,
  subCollectionAdd: SubCollectionAdd,
};

// Именованные re-exports для публичного API
export { BulkWizard };
export { Composer };
export { ConfirmDialog };
export { FormModal };
export { HeroCreate };
export { InlineSearch };
export { IntentButton };
export { Overflow };
export { OverlayManager };
export { SubCollectionAdd };
export { Toggle };
export { ModalShell } from "./FormModal.jsx";
export { useOverlayManager } from "./OverlayManager.jsx";
export {
  CAPTURE_WIDGETS,
  registerCaptureWidget,
  findCaptureWidgetById,
  findCaptureWidget,
} from "./capture/registry.js";
