import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class OfflineSyncEngine {
  static const String _queueKey = 'offline_reports_queue';
  static final Uuid _uuid = Uuid();
  static final _supabase = Supabase.instance.client;

  static Future<Map<String, dynamic>> queueReport({
    required String category,
    required String severity,
    required String description,
    required double lat,
    required double lng,
    required String imageUrl,
    String? name,
    String? mobile,
  }) async {
    final report = {
      'id': _uuid.v4(),
      'category': category,
      'severity_level': severity,
      'physical_observations': description,
      'geo_coordinates': '$lat, $lng',
      'image_url': imageUrl,
      'reported_by': name ?? 'Anonymous',
      'created_at': DateTime.now().toIso8601String(),
    };

    final prefs = await SharedPreferences.getInstance();
    final queueString = prefs.getString(_queueKey);
    List<dynamic> queue = queueString != null ? jsonDecode(queueString) : [];

    queue.add(report);
    await prefs.setString(_queueKey, jsonEncode(queue));

    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult.any((r) => r != ConnectivityResult.none)) {
      await triggerSyncProcess();
    }

    return {'success': true, 'report': report};
  }

  static Future<void> triggerSyncProcess() async {
    final prefs = await SharedPreferences.getInstance();
    final queueString = prefs.getString(_queueKey);
    if (queueString == null) return;

    List<dynamic> queue = jsonDecode(queueString);
    if (queue.isEmpty) return;

    List<dynamic> remainingQueue = [];

    for (var report in queue) {
      try {
        await _supabase.from('Field_reports').upsert(report);
      } catch (e) {
        try {
          // Fallback to lowercase table name
          await _supabase.from('field_reports').upsert(report);
        } catch (e2) {
          remainingQueue.add(report);
        }
      }
    }

    await prefs.setString(_queueKey, jsonEncode(remainingQueue));
  }

  static void initializeNetworkObserver() {
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> result) {
      if (result.any((r) => r != ConnectivityResult.none)) {
        triggerSyncProcess();
      }
    });
  }
}
