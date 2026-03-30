<?php
/*
 * Created on 2012-11-21
 *
 * To change the template for this generated file go to
 * Window - Preferences - PHPeclipse - PHP - Code Templates
 */
  header("Content-type:text/html;Charset=utf-8");
     $conn=mysqli_connect("192.168.1.223","admin2","123456Qq","synwaysms") or die("数据库服务器连接错误".mysqli_connect_error());
     mysqli_set_charset($conn, "utf8");
     mysqli_query($conn, "alter database synwaysms default character set 'utf8'");
     mysqli_query($conn, "set @@character_set_server='utf8'");
?>
