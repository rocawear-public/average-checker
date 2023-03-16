import { Extension, FurniDataUtils, HDirection, HFloorItem, Hotel, HPacket, HWallItem, GAsync, AwaitingPacket, } from "gnode-api";
import { name, description, version, author } from "../package.json";
function main() {
    const ext = new Extension({ name, description, version, author });
    ext.run();
    const gAsync = new GAsync(ext);
    let status = false;
    let furnitures;
    let roomFloorItems;
    let roomWallItems;
    let clickedItem;
    const onConnect = async (host) => {
        const endpoint = Hotel.fromHost(host);
        if (!endpoint)
            return;
        furnitures = await FurniDataUtils.fetch(endpoint);
    };
    const onObjects = async (hMessage) => {
        const items = HFloorItem.parse(hMessage.getPacket());
        roomFloorItems = items.map(({ id, typeId }) => ({
            id,
            typeId,
            type: 1,
            name: furnitures.getFloorItemByTypeId(typeId).name,
        }));
    };
    const onItems = async (hMessage) => {
        const items = HWallItem.parse(hMessage.getPacket());
        roomWallItems = items.map(({ id, typeId }) => ({
            id,
            typeId,
            type: 2,
            name: furnitures.getWallItemByTypeId(typeId).name,
        }));
    };
    const onUseFurniture = async (hMessage) => {
        hMessage.blocked = true;
        const packet = hMessage.getPacket();
        const id = packet.readInteger();
        const item = roomFloorItems.find((item) => item.id === id);
        if (!item)
            return;
        clickedItem = item;
        const avg = await getMarketPlaceAverage(item);
        if (!avg)
            return;
        const message = `${clickedItem.name} marketplace average is ${avg} coins!`;
        sendNotification(message);
    };
    const onUseWallItem = async (hMessage) => {
        hMessage.blocked = true;
        const packet = hMessage.getPacket();
        const id = packet.readInteger();
        const item = roomWallItems.find((item) => item.id === id);
        if (!item)
            return;
        clickedItem = item;
        const avg = await getMarketPlaceAverage(item);
        if (!avg)
            return;
        const message = `${clickedItem.name} marketplace average is ${avg} coins!`;
        sendNotification(message);
    };
    const onChat = async (hMessage) => {
        const packet = hMessage.getPacket();
        const message = packet.readString().toLocaleLowerCase();
        if (message.startsWith("!avg")) {
            hMessage.blocked = true;
            status = !status;
            sendNotification(`Average checker ${status ? "on" : "off"}!`);
        }
    };
    const sendNotification = async (message) => {
        const packet = new HPacket("Shout", HDirection.TOCLIENT);
        packet.appendInt(1234);
        packet.appendString(message);
        packet.appendInt(0);
        packet.appendInt(0);
        packet.appendInt(0);
        packet.appendInt(-1);
        ext.sendToClient(packet);
    };
    const getMarketPlaceAverage = async ({ type, typeId, }) => {
        const packet = new HPacket("GetMarketplaceItemStats", HDirection.TOSERVER);
        packet.appendInt(type);
        packet.appendInt(typeId);
        ext.sendToServer(packet);
        const awaitedPacket = await gAsync.awaitPacket(new AwaitingPacket("MarketplaceItemStats", HDirection.TOCLIENT, 1000));
        if (!awaitedPacket)
            return;
        const avg = awaitedPacket.readInteger();
        return avg;
    };
    const isStatus = (fn) => {
        return (hMessage) => {
            if (status) {
                fn(hMessage);
            }
        };
    };
    ext.on("connect", onConnect);
    ext.interceptByNameOrHash(HDirection.TOCLIENT, "Objects", isStatus(onObjects));
    ext.interceptByNameOrHash(HDirection.TOCLIENT, "Items", isStatus(onItems));
    ext.interceptByNameOrHash(HDirection.TOSERVER, "Chat", onChat);
    ext.interceptByNameOrHash(HDirection.TOSERVER, "Shout", onChat);
    ext.interceptByNameOrHash(HDirection.TOSERVER, "Whisper", onChat);
    ext.interceptByNameOrHash(HDirection.TOSERVER, "UseFurniture", isStatus(onUseFurniture));
    ext.interceptByNameOrHash(HDirection.TOSERVER, "UseWallItem", isStatus(onUseWallItem));
}
main();
