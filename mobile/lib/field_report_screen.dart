import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'offline_sync_engine.dart';

class FieldReportScreen extends StatefulWidget {
  @override
  _FieldReportScreenState createState() => _FieldReportScreenState();
}

class _FieldReportScreenState extends State<FieldReportScreen> {
  final TextEditingController _latController = TextEditingController();
  final TextEditingController _lngController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _mobileController = TextEditingController();
  final TextEditingController _customCategoryController = TextEditingController();

  String _selectedCategory = 'Ground / Slope Crack';
  String _selectedSeverity = 'High (Active Movement)';
  bool _isSubmitting = false;
  String? _imagePath;

  final List<String> _categories = ['Ground / Slope Crack', 'Rockfall', 'Mudslide', 'Road Blockage', 'Custom'];
  final List<String> _severities = ['Low (Observation)', 'Medium (Potential Risk)', 'High (Active Movement)', 'Critical (Immediate Danger)'];
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
  }

  Future<void> _autoDetectGPS() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showAlert('Error', 'Location services are disabled.');
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _showAlert('Error', 'Location permissions are denied');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _showAlert('Error', 'Location permissions are permanently denied.');
      return;
    } 

    try {
      Position position = await Geolocator.getCurrentPosition();
      setState(() {
        _latController.text = position.latitude.toStringAsFixed(5);
        _lngController.text = position.longitude.toStringAsFixed(5);
      });
    } catch (e) {
      _showAlert('Error', 'Failed to get location: $e');
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(source: source, imageQuality: 50);
      if (image != null) {
        setState(() {
          _imagePath = image.path;
        });
      }
    } catch (e) {
      _showAlert('Error', 'Failed to pick image: $e');
    }
  }

  void _submitReport() async {
    if (_latController.text.isEmpty || _lngController.text.isEmpty) {
      _showAlert('Error', 'Please provide Geo-Coordinates.');
      return;
    }
    if (_descriptionController.text.isEmpty) {
      _showAlert('Error', 'Please provide Landmark & Physical Observations.');
      return;
    }
    
    String finalCategory = _selectedCategory;
    if (_selectedCategory == 'Custom') {
      if (_customCategoryController.text.isEmpty) {
        _showAlert('Error', 'Please enter a custom incident category.');
        return;
      }
      finalCategory = _customCategoryController.text;
    }

    setState(() => _isSubmitting = true);

    try {
      final lat = double.tryParse(_latController.text) ?? 0.0;
      final lng = double.tryParse(_lngController.text) ?? 0.0;

      String finalImageUrl = 'https://example.com/sample.jpg';
      if (_imagePath != null) {
        final bytes = await File(_imagePath!).readAsBytes();
        finalImageUrl = "data:image/jpeg;base64," + base64Encode(bytes);
      }

      final result = await OfflineSyncEngine.queueReport(
        category: finalCategory,
        severity: _selectedSeverity,
        description: _descriptionController.text,
        lat: lat,
        lng: lng,
        imageUrl: finalImageUrl,
        name: _nameController.text,
        mobile: _mobileController.text,
      );

      if (result['success']) {
        _showAlert('Success', 'Report successfully queued or transmitted.');
        _descriptionController.clear();
        _nameController.clear();
        _mobileController.clear();
        _latController.clear();
        _lngController.clear();
        _customCategoryController.clear();
        setState(() {
          _imagePath = null;
          _selectedCategory = 'Ground / Slope Crack';
        });
      }
    } catch (e) {
      _showAlert('System Fault', e.toString());
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _showAlert(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Color(0xFF1E2538),
        title: Text(title, style: TextStyle(color: Colors.white)),
        content: Text(message, style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('OK', style: TextStyle(color: Color(0xFF6366f1))),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inputDecoration = InputDecoration(
      filled: true,
      fillColor: Color(0xFF0F141F),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Color(0xFF1F2937)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Color(0xFF1F2937)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Color(0xFF4F46E5)),
      ),
      hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 13),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    );

    return Scaffold(
      backgroundColor: Color(0xFF0A0F1D), 
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            margin: EdgeInsets.all(16),
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Color(0xFF13192B), 
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Color(0xFF1F2937)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Color(0xFF3B2E15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.camera_alt, color: Color(0xFFFBBF24), size: 24),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Submit Geo-Tagged Incident',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Offline-first crowd-sourcing & field reporting',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: Color(0xFF9CA3AF)),
                      onPressed: () {},
                      padding: EdgeInsets.zero,
                      constraints: BoxConstraints(),
                    ),
                  ],
                ),
                SizedBox(height: 24),
                
                // Row 1: Category and Severity
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Incident Category', style: _labelStyle()),
                          SizedBox(height: 8),
                          _buildDropdown(_categories, _selectedCategory, (v) => setState(() => _selectedCategory = v!)),
                        ],
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Estimated Severity', style: _labelStyle()),
                          SizedBox(height: 8),
                          _buildDropdown(_severities, _selectedSeverity, (v) => setState(() => _selectedSeverity = v!)),
                        ],
                      ),
                    ),
                  ],
                ),
                if (_selectedCategory == 'Custom') ...[
                  SizedBox(height: 12),
                  TextField(
                    controller: _customCategoryController,
                    style: TextStyle(color: Colors.white, fontSize: 14),
                    decoration: inputDecoration.copyWith(hintText: 'Type custom category...'),
                  ),
                ],
                SizedBox(height: 20),

                // Row 2: Geo-Coordinates
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Geo-Coordinates (WGS84)', style: _labelStyle()),
                    GestureDetector(
                      onTap: _autoDetectGPS,
                      child: Row(
                        children: [
                          Icon(Icons.gps_fixed, color: Color(0xFF8B5CF6), size: 14),
                          SizedBox(width: 4),
                          Text('Auto-Detect GPS', style: TextStyle(color: Color(0xFF8B5CF6), fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _latController,
                        style: TextStyle(color: Colors.white, fontSize: 14),
                        decoration: inputDecoration.copyWith(hintText: 'Latitude'),
                        keyboardType: TextInputType.numberWithOptions(decimal: true),
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        controller: _lngController,
                        style: TextStyle(color: Colors.white, fontSize: 14),
                        decoration: inputDecoration.copyWith(hintText: 'Longitude'),
                        keyboardType: TextInputType.numberWithOptions(decimal: true),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 20),

                // Row 3: Landmark
                Text('Landmark & Physical Observations', style: _labelStyle()),
                SizedBox(height: 8),
                TextField(
                  controller: _descriptionController,
                  maxLines: 4,
                  style: TextStyle(color: Colors.white, fontSize: 14),
                  decoration: inputDecoration.copyWith(
                    hintText: 'Describe road milepost, crack width (cm), continuous seepage, or trapped vehicles...',
                  ),
                ),
                SizedBox(height: 20),

                // Row 4: Photo Link
                Text('Photo Evidence', style: _labelStyle()),
                SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _imagePath == null
                          ? Container(
                              padding: EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Color(0xFF0F141F),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Color(0xFF1F2937)),
                              ),
                              child: Text('No image selected', style: TextStyle(color: Color(0xFF4B5563), fontSize: 13)),
                            )
                          : Container(
                              height: 60,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Color(0xFF1F2937)),
                                image: DecorationImage(
                                  image: FileImage(File(_imagePath!)),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                    ),
                    SizedBox(width: 12),
                    Column(
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Color(0xFF1F2937),
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () => _pickImage(ImageSource.camera),
                          icon: Icon(Icons.camera_alt, size: 16),
                          label: Text('Camera', style: TextStyle(fontSize: 12)),
                        ),
                        SizedBox(height: 4),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Color(0xFF1F2937),
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () => _pickImage(ImageSource.gallery),
                          icon: Icon(Icons.photo_library, size: 16),
                          label: Text('Gallery', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  ],
                ),
                SizedBox(height: 20),

                // Row 5: Name & Mobile
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _nameController,
                        style: TextStyle(color: Colors.white, fontSize: 14),
                        decoration: inputDecoration.copyWith(hintText: 'Your Name (Optional)', hintStyle: TextStyle(color: Color(0xFF3B82F6))),
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        controller: _mobileController,
                        style: TextStyle(color: Colors.white, fontSize: 14),
                        decoration: inputDecoration.copyWith(hintText: 'Mobile Number'),
                        keyboardType: TextInputType.phone,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 24),

                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        style: TextButton.styleFrom(
                          backgroundColor: Color(0xFF1F2937),
                          padding: EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {},
                        child: Text('Cancel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Color(0xFF6366F1),
                          padding: EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _isSubmitting ? null : _submitReport,
                        child: _isSubmitting
                            ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.upload, size: 18),
                                  SizedBox(width: 8),
                                  Text('Submit Report', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                ],
                              ),
                      ),
                    ),
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  TextStyle _labelStyle() {
    return GoogleFonts.inter(
      color: Colors.white,
      fontSize: 13,
      fontWeight: FontWeight.w600,
    );
  }

  Widget _buildDropdown(List<String> items, String value, Function(String?) onChanged) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Color(0xFF0F141F),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Color(0xFF1F2937)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          dropdownColor: Color(0xFF1F2937),
          icon: Icon(Icons.keyboard_arrow_down, color: Colors.white70),
          style: TextStyle(color: Colors.white, fontSize: 13),
          onChanged: onChanged,
          items: items.map((String item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(item),
            );
          }).toList(),
        ),
      ),
    );
  }
}
