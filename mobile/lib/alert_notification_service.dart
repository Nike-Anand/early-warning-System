import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Backend FastAPI base URL, overridable with --dart-define=API_BASE_URL.
/// Android emulator reaches the host at 10.0.2.2.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000',
);
/// Shows a high-priority "emergency alert" notification with a custom siren
/// sound and plays the siren out loud in the foreground.
class AlertNotificationService {
  AlertNotificationService._();
  static final AlertNotificationService instance =
      AlertNotificationService._();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  AudioPlayer? _sirenPlayer;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const InitializationSettings settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(settings);

    // Android 13+ needs POST_NOTIFICATIONS at runtime.
    final AndroidFlutterLocalNotificationsPlugin? androidImpl =
        _notifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidImpl?.requestNotificationsPermission();

    _sirenPlayer = AudioPlayer();
    await _sirenPlayer?.setReleaseMode(ReleaseMode.stop);
    _initialized = true;
  }
Future<void> showEmergencyAlert({
    required String zoneName,
    required String riskLevel,
    String? summary,
  }) async {
    final String title = 'EMERGENCY ALERT: $zoneName';
    final String body = (summary != null && summary.trim().isNotEmpty)
        ? summary.trim()
        : '$riskLevel landslide risk detected. Take action now!';

    // Play the siren out loud while the app is in the foreground.
    try {
      await _sirenPlayer?.stop();
      await _sirenPlayer?.play(AssetSource('sounds/siren_alert.wav'));
    } catch (_) {
      // Audio failures must never block the notification.
    }

    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'emergency_alerts',
      'Emergency Alerts',
      channelDescription: 'Critical landslide emergency alerts with siren',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      sound: RawResourceAndroidNotificationSound('siren_alert'),
      enableVibration: true,
      visibility: NotificationVisibility.public,
    );
const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBanner: true,
      presentSound: true,
      sound: 'siren_alert.wav',
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    final int id = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await _notifications.show(id, title, body, details);
  }
}
/// Periodically polls the backend alert history and raises a siren
/// notification whenever a *new* emergency alert appears.
class AlertMonitor {
  AlertMonitor({this.pollInterval = const Duration(seconds: 12)});

  final Duration pollInterval;
  Timer? _timer;
  bool _running = false;
  String? _lastSeenAlertId;

  static const String _lastSeenKey = 'last_seen_alert_id';

  Future<void> start() async {
    if (_running) return;
    _running = true;

    final prefs = await SharedPreferences.getInstance();
    _lastSeenAlertId = prefs.getString(_lastSeenKey);

    // Record the most recent id so pre-existing alerts are not re-fired.
    await _fetchAndCheck(recordOnly: true);
    _timer = Timer.periodic(pollInterval, (_) => _fetchAndCheck());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _running = false;
  }
Future<void> _fetchAndCheck({bool recordOnly = false}) async {
    try {
      final uri = Uri.parse('$apiBaseUrl/api/v1/alerts/history?limit=5');
      final http.Response res =
          await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return;

      final Map<String, dynamic> data =
          jsonDecode(res.body) as Map<String, dynamic>;
      final List<dynamic> alerts = (data['alerts'] as List?) ?? const [];
      if (alerts.isEmpty) return;

      // Each alert row is a psycopg2 tuple:
      // 0 alert_id, 1 risk_level, 2 factor_of_safety, 3 rainfall_ratio,
      // 4 dispatched_languages, 5 sms_count, 6 ws_broadcast, 7 summary_text,
      // 8 dispatched_at, 9 zone_name, 10 state
      final List<dynamic> latest = alerts.first as List<dynamic>;
      final String id = latest[0].toString();

      if (recordOnly) {
        _lastSeenAlertId = id;
        await _storeLastSeen(id);
        return;
      }
      if (id == _lastSeenAlertId) return;

      _lastSeenAlertId = id;
      await _storeLastSeen(id);

      final String riskLevel = latest[1]?.toString() ?? 'HIGH';
      final String zoneName = (latest.length > 9 && latest[9] != null)
          ? latest[9].toString()
          : 'Unknown zone';
      final String? summary = (latest.length > 7 && latest[7] != null)
          ? latest[7].toString()
          : null;

      await AlertNotificationService.instance.showEmergencyAlert(
        zoneName: zoneName,
        riskLevel: riskLevel,
        summary: summary,
      );
    } catch (_) {
      // Transient network/parse errors are swallowed; the next tick retries.
    }
  }

  Future<void> _storeLastSeen(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastSeenKey, id);
  }
}