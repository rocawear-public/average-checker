import {
  Extension,
  FurniData,
  FurniDataUtils,
  HDirection,
  HFloorItem,
  HMessage,
  Hotel,
  HPacket,
  HWallItem,
} from "gnode-api";
import { name, description, version, author } from "../package.json";

declare module "gnode-api" {
  namespace FurniDataUtils {
    export function fetch(hotel: Hotel): Promise<FurniData>;
  }
}

interface RoomItem {
  id: number;
  typeId: number;
  type: number;
  name: string;
}

function main() {
  const ext = new Extension({ name, description, version, author });
  ext.run();

  let status = false;
  let furnitures: FurniData;
  let roomFloorItems: RoomItem[];
  let roomWallItems: RoomItem[];
  let clickedItem: RoomItem;

  const onConnect = async (host: string) => {
    const endpoint = Hotel.fromHost(host);
    if (!endpoint) return;
    furnitures = await FurniDataUtils.fetch(endpoint);
  };

  const onObjects = async (hMessage: HMessage) => {
    if (!status) return;
    const items = HFloorItem.parse(hMessage.getPacket());
    roomFloorItems = items.map(({ id, typeId }) => ({
      id,
      typeId,
      type: 1,
      name: furnitures.getFloorItemByTypeId(typeId).name,
    }));
  };

  const onItems = async (hMessage: HMessage) => {
    if (!status) return;
    const items = HWallItem.parse(hMessage.getPacket());
    roomWallItems = items.map(({ id, typeId }) => ({
      id,
      typeId,
      type: 2,
      name: furnitures.getFloorItemByTypeId(typeId).name,
    }));
  };

  const onUseFurniture = async (hMessage: HMessage) => {
    if (!status) return;
    hMessage.blocked = true;
    const packet = hMessage.getPacket();
    const id = packet.readInteger();
    const item = roomFloorItems.find((item) => item.id === id);
    if (!item) return;
    clickedItem = item;
    requestMarketPlaceAverage(item);
  };

  const onUseWallItem = async (hMessage: HMessage) => {
    if (!status) return;
    hMessage.blocked = true;
    const packet = hMessage.getPacket();
    const id = packet.readInteger();
    const item = roomWallItems.find((item) => item.id === id);
    if (!item) return;
    clickedItem = item;
    requestMarketPlaceAverage(item);
  };

  const onMarketplaceItemStats = async (hMessage: HMessage) => {
    if (!status) return;
    hMessage.blocked = true;
    const packet = hMessage.getPacket();
    const avg = packet.readInteger();
    const message = `${clickedItem.name} marketplace average is ${avg} coins!`;
    sendNotification(message);
  };

  const onChat = async (hMessage: HMessage) => {
    const packet = hMessage.getPacket();
    const message = packet.readString().toLocaleLowerCase();

    if (message.startsWith("!avg")) {
      hMessage.blocked = true;
      status = !status;
      sendNotification(`Average checker ${status ? "on" : "off"}!`);
    }
  };

  const sendNotification = async (message: string) => {
    const packet = new HPacket("Shout", HDirection.TOCLIENT);
    packet.appendInt(1234);
    packet.appendString(message);
    packet.appendInt(0);
    packet.appendInt(0);
    packet.appendInt(0);
    packet.appendInt(-1);
    ext.sendToClient(packet);
  };

  const requestMarketPlaceAverage = ({ type, typeId }: Pick<RoomItem, "type" | "typeId">) => {
    const packet = new HPacket("GetMarketplaceItemStats", HDirection.TOSERVER);
    packet.appendInt(type);
    packet.appendInt(typeId);
    ext.sendToServer(packet);
  };

  ext.on("connect", onConnect);
  ext.interceptByNameOrHash(HDirection.TOCLIENT, "Objects", onObjects);
  ext.interceptByNameOrHash(HDirection.TOCLIENT, "Items", onItems);
  ext.interceptByNameOrHash(HDirection.TOCLIENT, "MarketplaceItemStats", onMarketplaceItemStats);
  ext.interceptByNameOrHash(HDirection.TOSERVER, "Chat", onChat);
  ext.interceptByNameOrHash(HDirection.TOSERVER, "Shout", onChat);
  ext.interceptByNameOrHash(HDirection.TOSERVER, "Whisper", onChat);
  ext.interceptByNameOrHash(HDirection.TOSERVER, "UseFurniture", onUseFurniture);
  ext.interceptByNameOrHash(HDirection.TOSERVER, "UseWallItem", onUseWallItem);
}

main();
