import Scoreboard from "@/components/Scoreboard";
import DisconnectedState from "@/components/bluetooth/DisconnectedState";
import Home from "@/components/Home";
import { PeripheralServices } from "@/types/bluetooth";
import { handleAndroidPermissions } from "@/utils/permission";
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Platform, Alert, Linking } from "react-native";
import BleManager, {
  BleDisconnectPeripheralEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from "react-native-ble-manager";

declare module "react-native-ble-manager" {
  interface Peripheral {
    connected?: boolean;
    connecting?: boolean;
  }
}

const SECONDS_TO_SCAN_FOR = 5;
const SERVICE_UUIDS: string[] = [];
const ALLOW_DUPLICATES = true;

const DEVICE_SERVICE_UUID = "7140efae-95ea-49d4-9b34-7aea29133e0f";
const TRANSFER_CHARACTERISTIC_UUID = "08a32d92-b94e-44d3-9e47-215dcfc2d79d";
const RECEIVE_CHARACTERISTIC_UUID = "08a32d92-b94e-44d3-9e47-215dcfc2d79d";
const NOTIFY_CHARACTERISTIC_UUID = "a57908f2-e036-44f9-8b8b-f5c0024cd800";

interface GameData {
  homeScore: number;
  awayScore: number;
  remainingSeconds: number;
  shotClock: number;
  selectedPeriod: number;
  possession: "HOME" | "AWAY" | "";
}

const Index: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(
    new Map<Peripheral["id"], Peripheral>()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [bleService, setBleService] = useState<PeripheralServices | undefined>(
    undefined
  );

  const [gameData, setGameData] = useState<GameData>({
    homeScore: 0,
    awayScore: 0,
    remainingSeconds: 600,
    shotClock: 24,
    selectedPeriod: 1,
    possession: "",
  });

  useEffect(() => {
    BleManager.start({ showAlert: false })
      .then(() => console.debug("BleManager started."))
      .catch((error: any) =>
        console.error("BeManager could not be started.", error)
      );

    const listeners: any[] = [
      BleManager.onDiscoverPeripheral(handleDiscoverPeripheral),
      BleManager.onStopScan(handleStopScan),
      BleManager.onConnectPeripheral(handleConnectPeripheral),
      BleManager.onDidUpdateValueForCharacteristic(
        handleUpdateValueForCharacteristic
      ),
      BleManager.onDisconnectPeripheral(handleDisconnectedPeripheral),
    ];

    handleAndroidPermissions();

    return () => {
      for (const listener of listeners) {
        listener.remove();
      }
    };
  }, []);

  const handleDisconnectedPeripheral = (
    event: BleDisconnectPeripheralEvent
  ) => {
    console.debug(
      `[handleDisconnectedPeripheral][${event.peripheral}] disconnected.`
    );
    setPeripherals((map) => {
      let p = map.get(event.peripheral);
      if (p) {
        p.connected = false;
        return new Map(map.set(event.peripheral, p));
      }
      return map;
    });

    setBleService(undefined);
    setIsConnected(false);
  };

  const handleConnectPeripheral = (event: any) => {
    console.log(`[handleConnectPeripheral][${event.peripheral}] connected.`);
  };

  const handleUpdateValueForCharacteristic = async (
    data: BleManagerDidUpdateValueForCharacteristicEvent
  ) => {
    console.debug(
      `[handleUpdateValueForCharacteristic] received data from '${data.peripheral}' with characteristic='${data.characteristic}' and value='${data.value}====='`
    );
  };

  const handleStopScan = () => {
    setIsScanning(false);
    console.debug("[handleStopScan] scan is stopped.");
  };

  const handleDiscoverPeripheral = (peripheral: Peripheral) => {
    if (!peripheral.name) {
      peripheral.name = "NO NAME";
    }

    if (peripheral.advertising?.serviceUUIDs?.includes(DEVICE_SERVICE_UUID)) {
      setPeripherals((map) => {
        return new Map(map.set(peripheral.id, peripheral));
      });
    }
  };

  const connectPeripheral = async (
    peripheral: Omit<Peripheral, "advertising">
  ) => {
    try {
      if (peripheral) {
        setPeripherals((map) => {
          let p = map.get(peripheral.id);
          if (p) {
            p.connecting = true;
            return new Map(map.set(p.id, p));
          }
          return map;
        });

        await BleManager.connect(peripheral.id);
        console.debug(`[connectPeripheral][${peripheral.id}] connected.`);
        setPeripherals((map) => {
          let p = map.get(peripheral.id);
          if (p) {
            p.connecting = false;
            p.connected = true;
            return new Map(map.set(p.id, p));
          }
          return map;
        });

        // before retrieving services, it is often a good idea to let bonding & connection finish properly
        await sleep(900);
        /* Test read current RSSI value, retrieve services first */
        const peripheralData = await BleManager.retrieveServices(peripheral.id);
        if (peripheralData.characteristics) {
          const peripheralParameters = {
            peripheralId: peripheral.id,
            serviceId: DEVICE_SERVICE_UUID,
            transfer: TRANSFER_CHARACTERISTIC_UUID,
            receive: RECEIVE_CHARACTERISTIC_UUID,
            notifyTransfer: NOTIFY_CHARACTERISTIC_UUID,
          };
          setBleService(peripheralParameters);
          setIsConnected(true);
        }
        setPeripherals((map) => {
          let p = map.get(peripheral.id);
          if (p) {
            return new Map(map.set(p.id, p));
          }
          return map;
        });
        const rssi = await BleManager.readRSSI(peripheral.id);
        if (peripheralData.characteristics) {
          for (const characteristic of peripheralData.characteristics) {
            if (characteristic.descriptors) {
              for (const descriptor of characteristic.descriptors) {
                try {
                  let data = await BleManager.readDescriptor(
                    peripheral.id,
                    characteristic.service,
                    characteristic.characteristic,
                    descriptor.uuid
                  );
                } catch (error) {
                  console.error(
                    `[connectPeripheral][${peripheral.id}] failed to retrieve descriptor ${descriptor.value} for characteristic ${characteristic.characteristic}:`,
                    error
                  );
                }
              }
            }
          }
        }
        setPeripherals((map) => {
          let p = map.get(peripheral.id);
          if (p) {
            p.rssi = rssi;
            return new Map(map.set(p.id, p));
          }
          return map;
        });
      }
    } catch (error) {
      console.error(
        `[connectPeripheral][${peripheral.id}] connectPeripheral error`,
        error
      );
    }
  };

  const disconnectPeripheral = async (peripheralId: string | undefined) => {
    try {
      if (!peripheralId) return;
      await BleManager.disconnect(peripheralId);
      setBleService(undefined);
      setPeripherals(new Map());
      setIsConnected(false);
    } catch (error) {
      console.error(
        `[disconnectPeripheral][${peripheralId}] disconnectPeripheral error`,
        error
      );
    }
  };

  function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  const enableBluetooth = async () => {
    try {
      console.debug("[enableBluetooth]");
      await BleManager.enableBluetooth();
    } catch (error) {
      console.error("[enableBluetooth] thrown", error);
    }
  };

  const startScan = async () => {
    const state = await BleManager.checkState();

    if (state === "off") {
      if (Platform.OS == "ios") {
        Alert.alert(
          "Enable Bluetooth",
          "Please enable Bluetooth in Settings to continue.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                Linking.openURL("App-Prefs:Bluetooth");
              },
            },
          ]
        );
      } else {
        enableBluetooth();
      }
    }
    if (!isScanning) {
      setPeripherals(new Map<Peripheral["id"], Peripheral>());
      try {
        console.debug("[startScan] starting scan...");
        setIsScanning(true);
        BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
          matchMode: BleScanMatchMode.Sticky,
          scanMode: BleScanMode.LowLatency,
          callbackType: BleScanCallbackType.AllMatches,
        })
          .then(() => {
            console.debug("[startScan] scan promise returned successfully.");
          })
          .catch((err: any) => {
            console.error("[startScan] ble scan returned in error", err);
          });
      } catch (error) {
        console.error("[startScan] ble scan error thrown", error);
      }
    }
  };

  const write = async () => {
    const MTU = 255;
    if (bleService) {
      const data = Array.from(new TextEncoder().encode("Hello World"));
      await BleManager.write(
        bleService.peripheralId,
        bleService.serviceId,
        bleService.transfer,
        data,
        MTU
      );
    }
  };

  const read = async () => {
    if (bleService) {
      const response = await BleManager.read(
        bleService.serviceId,
        bleService.peripheralId,
        bleService.receive
      );
      return response;
    }
  };

  return (
    <View style={styles.container}>
      {/* <ConnectedState
        onRead={read}
        onWrite={write}
        bleService={bleService}
        onDisconnect={disconnectPeripheral}
      /> */}
      {!isConnected ? (
        <Home
          peripherals={peripherals}
          onScanPress={startScan}
          onConnect={connectPeripheral}
          setGameData={setGameData}
          bleService={bleService}
        />
      ) : (
        // <DisconnectedState
        //   peripherals={Array.from(peripherals.values())}
        //   isScanning={isScanning}
        //   onScanPress={startScan}
        //   onConnect={connectPeripheral}
        // />
        bleService && (
          <Scoreboard
            onRead={read}
            onWrite={write}
            bleService={bleService}
            onDisconnect={disconnectPeripheral}
            gameData={gameData}
            setGameData={setGameData}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
});

export default Index;
