import { Text, Heading, Badge, Avatar, Image, Audio, Spacer, Divider, StatBar, PriceBlock, InfoSection, Timer } from "./atoms.jsx";
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

// Re-export primitives как named members — для прямого использования
// (например, в doменных canvas-wrapper'ах).
export { Map } from "./map.jsx";
export { Chart, Sparkline } from "./chart.jsx";
export { IrreversibleBadge } from "./IrreversibleBadge.jsx";
export { default as EmptyState } from "./EmptyState.jsx";
export { default as Carousel } from "./Carousel.jsx";
export { default as GatingPanel } from "./GatingPanel.jsx";
export { default as TreeNav } from "./TreeNav.jsx";

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
};
