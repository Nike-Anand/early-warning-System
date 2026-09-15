import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'alert_notification_service.dart';
import 'field_report_screen.dart';
import 'offline_sync_engine.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // TODO: Replace with actual Supabase URL and Anon Key
  await Supabase.initialize(
    url: 'https://ftoswgnwivydxmdxphgf.supabase.co',
    anonKey: 'sb_publishable_zUkFXvShYk-MKATo8zj49A_KPokqX62',
  );

  // Emergency alert notifications with siren sound (polls the backend).
  await AlertNotificationService.instance.initialize();
  AlertMonitor().start();

  OfflineSyncEngine.initializeNetworkObserver();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MDoNER Landslide App',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Color(0xFF0A0F1D), // Darker professional blue/black
        primaryColor: Color(0xFF4f46e5),
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
      ),
      home: FieldReportScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
