<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

/* ===== CONFIG API ===== */
define('API_IP',   '192.168.1.225');
define('API_PORT', '80');
define('API_USER', 'ApiUserAdmin');
define('API_PASS', '123456Qq');

/* ===== INCLUDE ===== */
include_once 'connectsql.php';
include_once 'post.php';

/* ===== DEVICE ID ===== */
$devId = '1';
if ($devId == '') {
    exit('Device ID empty');
}

/* ===== LẤY THÔNG TIN THIẾT BỊ ===== */
$result = mysqli_query($conn, "SELECT * FROM tb_dev_info WHERE id='$devId'");
if (!$result) {
    exit('Query tb_dev_info failed');
}

/* ===== GỌI API ===== */
$data = [];
$data['event'] = 'getdetailrxsms';

$uri    = "http://" . API_IP . ":" . API_PORT . "/API/QueryInfo";
$return = post($uri, API_USER, API_PASS, $data);

if (!$return) {
    mysqli_query($conn, "UPDATE tb_dev_info SET connState='3' WHERE id='$devId'");
    exit('API call failed');
}

/* ===== XỬ LÝ KẾT QUẢ ===== */
$SMSInfo = json_decode($return);
if (!$SMSInfo || $SMSInfo->result !== 'ok') {
    exit('API response invalid');
}

/* ===== LƯU SMS VÀO DB ===== */
for ($i = 0; $i < $SMSInfo->total; $i++) {

    $key = 'SMS' . $i;
    if (!isset($SMSInfo->$key)) continue;

    // Format: time:port:phone:content
    $arr = explode(':', $SMSInfo->$key, 4);
    if (count($arr) < 4) continue;

    $rcvTime     = addslashes($arr[0]);
    $rcvPort     = addslashes($arr[1]);
    $rcvPhoneNO  = addslashes($arr[2]);
    $rcvContent  = addslashes($arr[3]);

    // Check trùng
    $check = mysqli_query($conn, "
        SELECT id FROM tb_inbox1 
        WHERE rcvTime='$rcvTime'
          AND rcvPhoneNO='$rcvPhoneNO'
          AND port='$rcvPort'
          AND devId='$devId'
          AND rcvContent='$rcvContent'
    ");

    if ($check && mysqli_num_rows($check) == 0) {
        mysqli_query($conn, "
            INSERT INTO tb_inbox1 (devId, port, rcvPhoneNO, rcvContent, rcvTime)
            VALUES ('$devId', '$rcvPort', '$rcvPhoneNO', '$rcvContent', '$rcvTime')
        ");
    }
}

echo "DONE";

/* ===== GI? L?I FILTER ===== */
$sim_port = isset($_POST['sim_port']) ? $_POST['sim_port'] : '';
$page     = isset($_POST['page']) ? intval($_POST['page']) : 1;

/* ===== BUILD REDIRECT URL ===== */
$params = [];

if ($sim_port !== '') {
    $params[] = 'sim_port=' . urlencode($sim_port);
}
if ($page > 1) {
    $params[] = 'page=' . $page;
}

$query = $params ? '?' . implode('&', $params) : '';

if (isset($_POST['ajax'])) {
    echo "DONE";
    exit;
}

header("Location: index.php".$query);
exit;
