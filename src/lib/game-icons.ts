import { Cherry, CircleDot, Coins, Dice5, Gamepad2, Spade, TrendingUp } from "lucide-react";
import type { PocGame } from "@/lib/pocgames";

// One kind→icon map for every surface that renders the game catalog. Kept out of
// pocgames.ts so the pure verifier module stays free of React/icon imports.
export const GAME_ICONS: Record<PocGame["kind"], typeof Coins> = {
  flip: Coins,
  dice: Dice5,
  roulette: CircleDot,
  slots: Cherry,
  highcard: Spade,
  limbo: TrendingUp
};

export const FALLBACK_GAME_ICON = Gamepad2;
