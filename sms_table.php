<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('Asia/Ho_Chi_Minh');
include_once 'connectsql.php';

$pageSize = 10;

$filterKey = isset($_GET['sim_port']) ? mysqli_real_escape_string($conn, $_GET['sim_port']) : '';
$page = isset($_GET['page']) && intval($_GET['page']) > 0 ? intval($_GET['page']) : 1;

$where = "1";
if ($filterKey !== '' && strpos($filterKey, '|') !== false) {
    list($sim, $port) = explode('|', $filterKey, 2);
    $sim  = mysqli_real_escape_string($conn, $sim);
    $port = intval($port);
    $where .= " AND m.phone_number='$sim' AND i.port='$port'";
}

/* COUNT */
$countRes = mysqli_query($conn, "
    SELECT COUNT(*) total
    FROM tb_inbox1 i
    LEFT JOIN tb_port_phone_map m
        ON i.devId = m.devId AND i.port = m.port
    WHERE $where
");
$total = mysqli_fetch_assoc($countRes)['total'];
$totalPage = max(1, ceil($total / $pageSize));
$page = min($page, $totalPage);
$offset = ($page - 1) * $pageSize;

/* DATA */
$result = mysqli_query($conn, "
    SELECT i.port,i.devId,i.rcvPhoneNO,i.rcvContent,i.rcvTime,
           m.phone_number simPhone
    FROM tb_inbox1 i
    LEFT JOIN tb_port_phone_map m
        ON i.devId = m.devId AND i.port = m.port
    WHERE $where
    ORDER BY i.rcvTime DESC
    LIMIT $offset,$pageSize
");
?>

<table>
<tr>
    <th width="150">Thời gian</th>
    <th width="240">SIM - Port</th>
    <th width="150">Số gửi</th>
    <th>Nội dung</th>
</tr>

<?php if ($result && mysqli_num_rows($result) > 0) {
while ($row = mysqli_fetch_assoc($result)) { ?>
<tr>
    <td class="time">
        <?php
        $dt = DateTime::createFromFormat('YmdHis', $row['rcvTime']);
        echo $dt ? $dt->format('Y-m-d H:i:s') : '---';
        ?>
    </td>
    <td class="sim">
        📱 <?= htmlspecialchars($row['simPhone']) ?>
        <span style="color:#6b7280"> | Port <?= htmlspecialchars($row['port']) ?></span>
    </td>
    <td><?= htmlspecialchars($row['rcvPhoneNO']) ?></td>
    <td class="sms"><?= nl2br(htmlspecialchars($row['rcvContent'])) ?></td>
</tr>
<?php }} else { ?>
<tr>
    <td colspan="4" style="text-align:center;color:#9ca3af">
        Không có SMS
    </td>
</tr>
<?php } ?>
</table>
