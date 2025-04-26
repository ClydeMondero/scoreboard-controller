import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { PeripheralServices } from "@/types/bluetooth";

interface ConnectedStateProps {
  bleService: PeripheralServices | undefined;
  onRead: () => void;
  onWrite: () => void;
  onDisconnect: (id: string | undefined) => void;
}

const ConnectedState: React.FunctionComponent<ConnectedStateProps> = ({
  bleService,
  onDisconnect,
  onRead,
  onWrite,
}) => {
  return (
    <View className="flex-1 bg-black justify-center">
      {/* Score Section */}
      <View className="flex-row justify-around items-center">
        <View className="items-center">
          <Text className="text-white text-lg mb-1">HOME</Text>
          <Text className="text-blue-700 text-5xl font-bold">00</Text>
        </View>

        <View className="flex-1 items-center gap-4">
          <Text className="text-green-500 text-sm font-bold">
            PRESS TO START
          </Text>
          <Text className="text-yellow-400 text-7xl font-bold ">10:00</Text>
          <Text className="text-red-600 text-5xl font-bold ">24</Text>
          <Text className="text-white text-base ">PERIOD 1</Text>
        </View>

        <View className="items-center">
          <Text className="text-white text-lg mb-1">AWAY</Text>
          <Text className="text-blue-700 text-5xl font-bold">00</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View className="mt-6">
        <View className="flex-row justify-between my-2">
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">+1</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-green-600 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">START</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">+1</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between my-2">
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">-1</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-500 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">PAUSE</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">-1</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between my-2">
          <TouchableOpacity className="bg-red-800 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">
              RESET 24
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-red-800 p-4 rounded-lg flex-1 mx-1">
            <Text className="text-white text-center font-semibold">
              RESET 14
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between my-2">
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-0.5">
            <Text className="text-white text-center font-semibold">-F</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-0.5">
            <Text className="text-white text-center font-semibold">+F</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-0.5">
            <Text className="text-white text-center font-semibold">+F</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-0.5">
            <Text className="text-white text-center font-semibold">-F</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Home / Away Bottom Navigation */}
      <View className="flex-row justify-around mt-4">
        <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-2">
          <Text className="text-white text-center font-semibold">HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-blue-500 p-4 rounded-lg flex-1 mx-2">
          <Text className="text-white text-center font-semibold">AWAY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ConnectedState;
