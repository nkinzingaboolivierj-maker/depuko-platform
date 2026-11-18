/** Worker training (V7.4). Training content delivery requires an owner-side
 * content source; this screen states that honestly and offers the support
 * path rather than fabricating courses. */
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function Training({ token }: { token: string }) {
  function contactSupport() {
    fetch(`${BASE}/support/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category: "training" }),
    }).catch(() => undefined);
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h}>Training</Text>
      <Text style={s.body}>
        Training modules are not yet published. Content requires owner
        configuration (curriculum + storage). Until then, request training
        through support - a human will respond.
      </Text>
      <Button title="Request training via support" onPress={contactSupport} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  h: { fontSize: 20, fontWeight: "700" },
  body: { color: "#555", lineHeight: 22 },
});