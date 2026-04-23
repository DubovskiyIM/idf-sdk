import { Text, Heading, Badge, Avatar, Image, Audio, Spacer, Divider, StatBar, PriceBlock, InfoSection, Timer, Statistic } from "./atoms.jsx";
import { Row, Column, Card, List } from "./containers.jsx";
import { Chart, Sparkline } from "./chart.jsx";
import { Map } from "./map.jsx";
import { IrreversibleBadge } from "./IrreversibleBadge.jsx";
import EmptyState from "./EmptyState.jsx";
import Carousel from "./Carousel.jsx";
import GatingPanel from "./GatingPanel.jsx";
import CriterionSummary from "./CriterionSummary.jsx";
import RatingAggregate from "./RatingAggregate.jsx";
import TreeNav from "./TreeNav.jsx";
import Breadcrumbs from "./Breadcrumbs.jsx";
import SchemaEditor from "./SchemaEditor.jsx";
import DataGrid from "./DataGrid.jsx";
import PermissionMatrix from "./PermissionMatrix.jsx";
import Wizard from "./Wizard.jsx";

// Re-export primitives как named members — для прямого использования
// (например, в doменных canvas-wrapper'ах).
export { Map } from "./map.jsx";
export { Chart, Sparkline } from "./chart.jsx";
export { IrreversibleBadge } from "./IrreversibleBadge.jsx";
export { default as EmptyState } from "./EmptyState.jsx";
export { default as Carousel } from "./Carousel.jsx";
export { default as GatingPanel } from "./GatingPanel.jsx";
export { default as TreeNav } from "./TreeNav.jsx";
export { default as Breadcrumbs } from "./Breadcrumbs.jsx";
export { default as SchemaEditor } from "./SchemaEditor.jsx";
export { default as DataGrid } from "./DataGrid.jsx";
export { default as PermissionMatrix } from "./PermissionMatrix.jsx";
export { default as Wizard } from "./Wizard.jsx";

export const PRIMITIVES = {
  text: Text,
  heading: Heading,
  badge: Badge,
  avatar: Avatar,
  image: Image,
  audio: Audio,
  spacer: Spacer,
  divider: Divider,
  statBar: StatBar,
  priceBlock: PriceBlock,
  infoSection: InfoSection,
  timer: Timer,
  // backlog §8.4 — inline primitive для catalog-item-children.
  // countdown — alias на timer (семантический synonym).
  statistic: Statistic,
  countdown: Timer,
  row: Row,
  column: Column,
  card: Card,
  list: List,
  chart: Chart,
  sparkline: Sparkline,
  map: Map,
  irreversibleBadge: IrreversibleBadge,
  emptyState: EmptyState,
  carousel: Carousel,
  gatingPanel: GatingPanel,
  criterionSummary: CriterionSummary,
  ratingAggregate: RatingAggregate,
  treeNav: TreeNav,
  breadcrumbs: Breadcrumbs,
  schemaEditor: SchemaEditor,
  dataGrid: DataGrid,
  permissionMatrix: PermissionMatrix,
  wizard: Wizard,
};
