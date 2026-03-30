<?php
function post($url,$user,$passwd,$dataArr)
{	
	// 参数数组
	$data_json = json_encode($dataArr);
		
	$ch = curl_init ();
	
	$userpwd = $user.":".$passwd;
	curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
	curl_setopt($ch, CURLOPT_USERPWD, $userpwd);
	
	curl_setopt ( $ch, CURLOPT_URL, $url );
	
	curl_setopt ( $ch, CURLOPT_POST, 1 );
	curl_setopt ( $ch, CURLOPT_RETURNTRANSFER, 1);
	
	curl_setopt ( $ch, CURLOPT_POSTFIELDS, $data_json );
	
	curl_setopt($ch, CURLOPT_TIMEOUT, 60);
	
	curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data_json))
	);
	
	$return = curl_exec ( $ch );
	$httpCode = curl_getinfo($ch,CURLINFO_HTTP_CODE);
	curl_close ( $ch );
	if($httpCode == 401)
	{
		return false;
	}
	
	return $return;
}
?>
