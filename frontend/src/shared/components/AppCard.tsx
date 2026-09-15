import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";

import { GlassSurface } from "@/shared/components/GlassSurface";
import { theme } from "@/shared/constants/theme";

type AppCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AppCard({ children, style }: AppCardProps) {
  return (
    <GlassSurface radius={theme.radius.lg} style={style}>
      {children}
    </GlassSurface>
  );
}
