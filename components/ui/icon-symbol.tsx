import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "gearshape.fill": "settings",
  "calendar": "calendar-today",
  "doc.text.fill": "description",
  "plus": "add",
  "trash": "delete",
  "pencil": "edit",
  "checkmark": "check",
  "xmark": "close",
  "chevron.left": "chevron-left",
  "arrow.left": "arrow-back",
  "truck.box.fill": "local-shipping",
  "map.fill": "map",
  "cube.box.fill": "inventory",
  "rublesign.circle.fill": "monetization-on",
  "chart.bar.fill": "bar-chart",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
