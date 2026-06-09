import { BasePlatform } from "./BasePlatform";
import { TaoBaoMiniGame } from "./TaoBaoMiniGame";
export type Constructor<T = {}> = new (...args: any[]) => T;

export interface SupportPlatform {
    [key: string]: Constructor<BasePlatform>;
}
export interface ChannelToName {
    [key: string]: string,
}

export const supportPlatform: SupportPlatform = {
    "taobao-mini-game": TaoBaoMiniGame
}

export const channelToName: ChannelToName = {
    "taobao-mini-game": "淘宝小游戏"
}
