<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('Asia/Ho_Chi_Minh');
include_once 'connectsql.php';

/* ===== CONFIG ===== */
$pageSize = 10;

/* ===== FILTER ===== */
$filterKey = isset($_GET['sim_port']) ? mysqli_real_escape_string($conn, $_GET['sim_port']) : '';
$page = isset($_GET['page']) && intval($_GET['page']) > 0 ? intval($_GET['page']) : 1;

$where = "1";
if ($filterKey !== '' && strpos($filterKey, '|') !== false) {
    list($sim, $port) = explode('|', $filterKey, 2);
    $where .= " AND m.phone_number='$sim' AND i.port='$port'";
}

/* ===== COUNT ===== */
$countSql = "
    SELECT COUNT(*) AS total
    FROM tb_inbox1 i
    LEFT JOIN tb_port_phone_map m
        ON i.devId = m.devId AND i.port = m.port
    WHERE $where
";
$countRes = mysqli_query($conn, $countSql);
$totalRow = mysqli_fetch_assoc($countRes);
$total = intval($totalRow['total']);
$totalPage = max(1, ceil($total / $pageSize));
if ($page > $totalPage) $page = $totalPage;
$offset = ($page - 1) * $pageSize;

/* ===== DATA ===== */
$sql = "
    SELECT 
        i.port,
        i.devId,
        i.rcvPhoneNO,
        i.rcvContent,
        i.rcvTime,
        m.phone_number AS simPhone
    FROM tb_inbox1 i
    LEFT JOIN tb_port_phone_map m
        ON i.devId = m.devId AND i.port = m.port
    WHERE $where
    ORDER BY i.rcvTime DESC
    LIMIT $offset, $pageSize
";
$result = mysqli_query($conn, $sql);

/* ===== SIM LIST ===== */
$simPortList = mysqli_query($conn, "
    SELECT DISTINCT phone_number, port
    FROM tb_port_phone_map
    ORDER BY port ASC, phone_number ASC
");
?>
<script>
(function autoUpdateSMS(){
    const interval = 20000; // 20 giây

    function callUpdateAPI() {
        const formData = new FormData();
        formData.append('sim_port', '<?= addslashes($filterKey) ?>');
        formData.append('page', '<?= $page ?>');

        fetch('updatesms.php', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(res => res.text())
        .then(data => {
            console.log('✅ SMS updated at', new Date().toLocaleTimeString());
            // nếu muốn reload table sau khi update:
            // location.reload();
        })
        .catch(err => console.error('❌ Update SMS error:', err));
    }

    // chạy ngay lần đầu
    callUpdateAPI();

    // chạy mỗi 10s
    setInterval(callUpdateAPI, interval);
})();
</script>

<script>
(function autoReloadTable(){
    const interval = 7000; // 7s

    function reloadTable() {
        const params = new URLSearchParams({
            sim_port: <?= json_encode($filterKey) ?>,
            page: <?= (int)$page ?>
        });

        fetch('sms_table.php?' + params.toString(), {
            cache: 'no-store'
        })
        .then(res => res.text())
        .then(html => {
            document.getElementById('smsTable').innerHTML = html;
            console.log('🔄 Table SMS reloaded', new Date().toLocaleTimeString());
        })
        .catch(err => console.error('❌ Reload table error', err));
    }

    // load ngay
    reloadTable();

    // lặp mỗi 10s
    setInterval(reloadTable, interval);
})();
</script>
<div class="sms-container p-1">
    <!-- Bộ lọc tinh gọn -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
        <form method="get" class="flex items-center gap-2 w-full sm:w-auto">
            <span class="text-xs font-bold text-gray-500 uppercase">Lọc theo SIM:</span>
            <select name="sim_port" class="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 bg-white shadow-sm outline-none">
                <option value="">-- Tất cả --</option>
                <?php mysqli_data_seek($simPortList, 0); while ($sp = mysqli_fetch_assoc($simPortList)) {
                    $val = $sp['phone_number'].'|'.$sp['port'];
                ?>
                <option value="<?= $val ?>" <?= ($val == $filterKey ? 'selected' : '') ?>>
                    <?= $sp['phone_number'] ?> (P<?= $sp['port'] ?>)
                </option>
                <?php } ?>
            </select>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Lọc</button>
        </form>

        <div class="text-[11px] text-gray-400 font-medium">
            Hiển thị <?= mysqli_num_rows($result) ?>/<?= $total ?> tin nhắn
        </div>
    </div>

    <!-- Bảng tin nhắn với thiết kế hiện đại -->
    <div id="smsTable" class="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <?php include 'sms_table.php'; ?>
    </div>

    <!-- Phân trang kiểu Button -->
    <div class="pagination flex justify-center items-center gap-1 mt-6 pb-4">
    <?php
    $queryBase = $filterKey ? "&sim_port=".$filterKey : "";
    if ($page > 1)
        echo '<a href="?page='.($page-1).$queryBase.'" class="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">« Trước</a>';

    for ($p=1;$p<=$totalPage;$p++){
        if ($totalPage > 10 && !($p <= 3 || $p >= $totalPage - 2 || ($p >= $page - 1 && $p <= $page + 1))) { if ($p == 4 || $p == $totalPage - 3) echo "<span class='px-2'>...</span>"; continue; }
        $activeCls = $p==$page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50';
        echo '<a href="?page='.$p.$queryBase.'" class="w-9 h-9 flex items-center justify-center rounded-lg border font-medium text-sm transition-all '.$activeCls.'">'.$p.'</a>';
    }

    if ($page < $totalPage)
        echo '<a href="?page='.($page+1).$queryBase.'" class="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">Sau »</a>';
    ?>
    </div>
</div>
