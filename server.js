var http = require('http');
var url = require('url');
var fs = require('fs');
var queryString = require("querystring");

var server = http.createServer(function(request, response) {

    // Make a new request based off the request URL parameters (party size, date, and time)
    var url_parts = url.parse(request.url, true);
    console.log(url_parts.pathname);

    //make a reservation
    if(url_parts.pathname == '/reservations'){
        var partySize = url_parts.query.partySize;
        var date = url_parts.query.date;
        var time = url_parts.query.time;
        var metroId = url_parts.query.metroId;
        var pageIndex = 0;
        var from = 0;
        var size = 3000;

        getData(null, pageIndex, partySize, date, time, metroId, from, size, response);
    }
    else if(url_parts.pathname == '/centerMap') {
        var from = 0;
        var size = 3000;
        var metroId = url_parts.query.metroId;
        centerMap(null, metroId,response, from, size);
    }

    //send the contents of a list to the client
    else if(url_parts.pathname == '/loadlist'){
        var listname = url_parts.query.listname;
        loadList(listname, response);
    }

    //send the various options for a list to the client
    else if(url_parts.pathname== '/loadListOptions'){
        getLists(response);
    }

    //create and save a new list
    else if(url_parts.pathname == '/createNewList'){
        createNewList(request,response);
    }

    else if(url_parts.pathname == '/deleteList'){
        var fileName = "./Lists/" + url_parts.query.filename + ".txt";
        console.log("File name is: " + fileName);
        fs.unlink(fileName, function(err){
            if(err) {
                console.log(err);
                throw err;
            }
            else {
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.end();
            }
        })
    }

    //update the list - add a restaurant
    else if(url_parts.pathname == '/addRestaurant'){
        var listName = url_parts.query.listName;
        var restaurantName = url_parts.query.restaurantName;
        console.log("adding restaurant: " + restaurantName + "to list: " + listName);
        addRestaurant(listName,restaurantName, response);
    }

    else if(url_parts.pathname == '/removeRestaurant'){
        var listName = url_parts.query.listName;
        var restaurantReplacement = "," + url_parts.query.restaurantName;
        var fileName = "./Lists/" + listName + ".txt";
        var re = new RegExp(restaurantReplacement, "g");
        fs.readFile(fileName, function(err,data){
            if(err) throw err;
            var str = data.toString('utf8');
            var newString = str.replace(re, "");
            fs.writeFile(fileName, newString, function(err){
                if(err) return console.log(err);
            });
        });
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.end();
    }

});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

server.listen(server_port, server_ip_address, function () {
    console.log( "Listening on: " + server_ip_address + ":" + server_port )
});

/*server.listen(1234,function(){
    console.log("Listening on 1234;");
});*/

function createNewList(request,response){
    var body = "";
    request.on('data', function (chunk) {
        body += chunk;
    });
    request.on('end', function () {
        console.log('POSTed: ' + body);
        var jsonContent = JSON.parse(body);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.end(createFile(jsonContent));
    });
}

function createFile(jsonContent){
    console.log("In createFile function - json content is " + JSON.stringify(jsonContent));
    var fileString = "./Lists/"+ jsonContent.listName + ".txt";
    fs.writeFile(fileString, jsonContent.metroId, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function getLists(response){
    fs.readdir('./Lists/', function(err,files){
        if(err){
            return console.log(err);
        }
        console.log(files);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.end(files.toString());
    });
}

function loadList(listname, response){
    var filename = './Lists/' + listname + '.txt';
    console.log(filename);
    fs.readFile(filename, function(err, data){
        if(err){
            return console.log(err);
        }
        console.log(data);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.end(data);
    });
}

function addRestaurant(listName,restaurantName, response){
    fileName = "./Lists/" + listName + ".txt";
    fs.appendFile(fileName, ","+restaurantName, function (err) {
        if (err) throw err;
        console.log("Restaurant added");
    });
    response.setHeader("Content-Type", "text/json");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.statusCode = 200;
    response.end();
}

function centerMap(fullObj, metroId,response, from, size){
    var urlEndpoint = "http://www.opentable.com/s/api?metroid=" + metroId+"&from="+from+ "&size="+size;
    var tempStr = "";
    http.get(urlEndpoint, function(openTableResponse) {
        openTableResponse.on('data', function (chunk) {
            tempStr += chunk;
        });
        openTableResponse.on('end', function () {
            var jsonObj = JSON.parse(tempStr);
            console.log("Total available: " + jsonObj.Results.TotalAvailable + " from: " + from + " size: " +size );
            if (from == 0) {
                fullObj = jsonObj;
            }else{
                for (var i in jsonObj.Results.Restaurants){
                    fullObj.Results.Restaurants.push(i);
                }
            }
            if (jsonObj.Results.TotalAvailable > (from + size)) {
                from = from + size;
                centerMap(fullObj, metroId, response, from, size);
            }else{
                response.setHeader("Content-Type", "text/json");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.statusCode = 200;
                response.end(JSON.stringify(fullObj));
            }
        });
    }).on('error', function (e) {
        response.statusCode = 500;
        response.end("error occurred");
    })
}

function getData(fullObj, pageIndex, partySize, date, time, metroId, from, size, response) {
     var urlEndpoint = "http://www.opentable.com/s/api?datetime=" + date + "%20" + time + "&covers=" + partySize + "&metroid=" + metroId + "&showmap=false&sort=Name&size=" + size+ "&excludefields=Description&from=" + from + "&PageType=0";
     console.log(urlEndpoint);

     var tempStr = "";
     http.get(urlEndpoint, function(openTableResponse){
         openTableResponse.on('data', function(chunk) {
             tempStr += chunk;
         });
         openTableResponse.on('end', function(){
             var jsonObj = JSON.parse(tempStr);
             if(jsonObj.Results.TotalAvailable == 0){
                 fullObj = {"message": "No search results"};
             } else if (jsonObj.Results.TotalAvailable > (from+size)){
                 if (from == 0) {
                     fullObj = jsonObj;
                 }else{
                     for (var i in jsonObj.Results.Restaurants){
                         fullObj.Results.Restaurants.push(i);
                     }
                 }
                 from = from+size;
                 getData(fullObj, pageIndex, partySize, date, time,metroId, from, size, response);
             } else {
                 if (from == 0) {
                     fullObj = jsonObj;
                 }else{
                     for (var i in jsonObj.Results.Restaurants){
                         fullObj.Results.Restaurants.push(i);
                     }
                 }
                 response.setHeader("Content-Type", "text/json");
                 response.setHeader("Access-Control-Allow-Origin", "*");
                 response.statusCode = 200;
                 response.end(JSON.stringify(fullObj));
             }

         });
     }).on('error', function (e) {
         console.log("Got error: " + e.message);
         response.statusCode = 500;
         response.end("Error occurred");
     });
}
