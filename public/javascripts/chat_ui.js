// chat_ui.js
//

// ユーザによって入力された信頼できないテキストデータ
function divEscapedContentElement( message ) {
  return $('<div></div>').text(message);
}

// システムによって作られた信頼できるデータ
function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');
}

// ユーザ入力を処理する関数
// '/'で始まっていたら、チャットコマンドとして扱う
// それ以外は、チャットメッセージとして扱い、他のユーザーに
// ブロードキャストされるようサーバに送られる
//
function processUserInput( chatApp, socket ) {
  var message = $('#send-message').val();
  var systemMessage;

  console.log('message> ' + message);

  if (message.charAt(0) == '/') {
	systemMessage = chatApp.processCommand( message );
	if (systemMessage) {
	  $('#messages').append( divSystemContentElement( systemMessage ));
	}
  } else {
	chatApp.sendMessage( $('#room').text(), message );

	$('#messages').append( divEscapedContentElement( message ));
	$('#messages').scrollTop( $('#messages').prop('scrollHeight'));
	  
  }
  $('#send-message').val('');
}

// クライアントサイドアプリケーションの初期化ロジック
//
var socket = io.connect();

$(document).ready(function() {
  var room;
  var chatApp = new Chat( socket );
  socket.on( 'nameResult', function( result ) {
	var message;

	if (result.success) {
	  // message = 'You are now known as ' + result.name + '.';
	  message = 'あなたのユーザー名は ' + result.name + ' です。';
	} else {
	  message = result.message;
	}
	$('#messages').append(divSystemContentElement( message ));
  });

  socket.on( 'joinResult', function (result) {
	$('#room').text( result.room );
	$('#messages').append( divSystemContentElement( '部屋が変わりました。'));
  });

  socket.on( 'message', function (message) {
	var newElement = $('<div></div>').text(message.text);
	$('#messages').append(newElement);
  });

  socket.on( 'rooms', function (rooms) {
	$('#room-list').empty();
	for (room in rooms) {
	  room = room.substring(1, room.length);
	  if (room != '') {
		$('#room-list').append(divEscapedContentElement(room));
	  }
	}
	// ルーム名をクリックすると、その部屋に移動できるようにする
	$('#room-list div').click( function () {
	  chatApp.processCommand('/join ' + $(this).text());
	  $('#send-message').focus();
	});
  });

  // 利用できるルームのリストは周期的に問い合わせる
  setInterval( function() {
	socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();

  $('#send-form').submit( function() {
	processUserInput( chatApp, socket );
	return false;
  });
});
