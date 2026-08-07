import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Play not found.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Georgia Tech</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    padding: 20,
  },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.white },
  link: { marginTop: 16, paddingVertical: 12 },
  linkText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.gold },
});
