var http = require('http');
var url = require('url');

var server = http.createServer(function(request, response){

    // Make a new request based off the request URL parameters (party size, date, and time)
    var url_parts = url.parse(request.url, true);
    var partySize = url_parts.query.partySize;
    var date = url_parts.query.date;
    var time = url_parts.query.time;
    var pageIndex = 0;
    var str = [];
    var from = 0;
    var size = 3000;

    getData(str, pageIndex, partySize, date, time, from, size, response);


});

var server2 = http.createServer(function(request, response){
    response.statusCode = 200;
    response.end("Hello world");
});

server.listen(1234);
server2.listen(8080);

function getData(str, pageIndex, partySize, date, time, from, size, response) {
     var urlEndpoint = "http://www.opentable.com/s/api?datetime=" + date + "%20" + time + "&covers=" + partySize + "&metroid=4&regionids=5&showmap=false&sort=Name&size=" + size+ "&excludefields=Description&from=" + from + "&PageType=0";
     console.log(urlEndpoint);

     var tempStr = "";
     http.get(urlEndpoint, function(openTableResponse){
         openTableResponse.on('data', function(chunk) {
             tempStr += chunk;
         });
         openTableResponse.on('end', function(){
             var jsonObj = JSON.parse(tempStr);
             if(jsonObj.Results.TotalAvailable == 0){
                 str.push("No search results");
             } else if (jsonObj.Results.TotalAvailable > (from+size)){
                 from = from+size;
                 getData(str, pageIndex, partySize, date, time, from, size, response);
             }
             str.push(JSON.parse(tempStr));
             response.statusCode = 200;
             response.setHeader("Content-Type", "text/json");
             response.setHeader("Access-Control-Allow-Origin", "*");
             response.end(JSON.stringify(str));

         });
     }).on('error', function (e) {
         console.log("Got error: " + e.message);
         response.statusCode = 500;
         response.end("Error occurred");
     });
}

