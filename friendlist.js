audio = new Audio('sound.mp3');
friendliststatuses=[0,0,0,0,0,0,0,0,0,0].map(() => "Unknown");

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.friendlist == "enable") {
            console.log("enabling...");
            setInterval(function(){check();},1000);
            var check = function(){chrome.permissions.contains({
                permissions: ['notifications'],
            }, function(result) {if(result){localStorage.setItem("iOfriendlistenabled",1);chrome.storage.sync.set({iOfriendsenabled : "1"},function(){location.reload();});}});
                                  };

        }
        if (request.friendlist == "refresh") {
		location.reload();}
        if (request.getfriendsbystatus) {
            try{list = [friendlist[0]===undefined||friendliststatuses[0]!==request.getfriendsbystatus ? "" : friendlist[0],friendlist[1]===undefined||friendliststatuses[1]!==request.getfriendsbystatus ? "" : friendlist[1],friendlist[2]===undefined||friendliststatuses[2]!==request.getfriendsbystatus ? "" : friendlist[2],friendlist[3]===undefined||friendliststatuses[3]!==request.getfriendsbystatus ? "" : friendlist[3],friendlist[4]===undefined||friendliststatuses[4]!==request.getfriendsbystatus ? "" : friendlist[4],friendlist[5]===undefined||friendliststatuses[5]!==request.getfriendsbystatus ? "" : friendlist[5],friendlist[6]===undefined||friendliststatuses[6]!==request.getfriendsbystatus ? "" : friendlist[6],friendlist[7]===undefined||friendliststatuses[7]!==request.getfriendsbystatus ? "" : friendlist[7],friendlist[8]===undefined||friendliststatuses[8]!==request.getfriendsbystatus ? "" : friendlist[8],friendlist[9]===undefined||friendliststatuses[9]!==request.getfriendsbystatus ? "" : friendlist[9]].filter(Boolean);
                sendResponse({thelist: list});}
            catch(err){
                sendResponse({thelist: "error"});}
        }
        if (request.addfriend) {
            if(friendlist.length==10){sendResponse({result: "ok"});couldNotAdd("Reached maximum amount of friends (10). You can remove friends by going to their profiles.");} 
            else {
                sendResponse({result: "ok"});
                checkfollowing(0,request.addfriend[0],request.addfriend[1]);}
        }
        if (request.removefriend) {
            sendResponse({result: "ok"});
            friendlist.splice(friendlist.indexOf(request.removefriend), 1);
            chrome.storage.sync.set({iOfriendlist : friendlist}, function(){anynotification("Removed "+request.removefriend+" of friend list","You won't receive notifications when they get online anymore.");setTimeout(function(){location.reload()},100);});
        }
    });


chrome.permissions.contains({
    permissions: ['notifications'],
}, function(result) {
    if (result && localStorage.getItem("iOfriendlistenabled")==1) {
        chrome.storage.sync.get(["iOaccounts", "iOfriendlist", "iOfriendlistenabled"], function (data) {
            registeredUsers = JSON.stringify(data.iOaccounts) === "{}" ? [] : JSON.parse(data.iOaccounts);
            friendlist = typeof(data.iOfriendlist)==="undefined" ? [] : data.iOfriendlist;
            if(friendlist.length==0){localStorage.setItem("iOfriendsempty","1");}else{localStorage.setItem("iOfriendsempty","0");}
            for (i = 0; i < registeredUsers.length; i++) {
                if(registeredUsers[i].key !== "changed"){localuser = registeredUsers[i].name;key = registeredUsers[i].key;friendlistcode();}
            }
        });
    }
});

function friendlistcode() {

    if (JSON.stringify(friendlist)==="[]"){return;}
    time = function(){return Math.floor(Date.now() / 1000);};

    x = 0;
    firsttime = true;
    max = friendlist.length-1;
    interval = 1000;
    scratchopen = true;

    setInterval(function(){
        chrome.tabs.query({url:"https://scratch.mit.edu/*"}, function(tabs) {
            if (scratchopen === false && tabs.length>0){location.reload();}
            if  (firsttime && tabs.length>0){firsttime=false;docheck();}
            scratchopen = tabs.length>0;
            if(scratchopen===false){friendliststatuses=[0,0,0,0,0,0,0,0,0,0].map(() => "Unknown");chrome.browserAction.getBadgeText({}, function(result) {console.log(result);if(result!==" "){chrome.browserAction.setBadgeText({text: ""});}});}
        });
    }, 3000);

}

function docheck(){
    if(x>max){console.log("x>max");interval=60000/(max+1);x=0;console.log("Interval: "+interval);check(x);}
    else{check(x);}
}





function check(i) {
    if(!scratchopen){return;}
    x++;
    console.log("Checking #"+(i+1)+": @"+friendlist[i]);
    getstatus = new XMLHttpRequest();getstatus.open("GET", ' https://scratchtools.tk/isonline/api/v1/' + localuser + '/' + key + "/get/" + friendlist[i], true);getstatus.send();
    getstatus.onreadystatechange = function() {
        if (getstatus.readyState === 4) {
            if (getstatus.status === 200) {

                response  = getstatus.responseText;
                timestamp = JSON.parse(response).timestamp;
                var status = JSON.parse(response).status;

                if (status == "online") {
                    if (time() - timestamp < 300) {
                        if(friendliststatuses[i]=="Offline" || (localStorage.getItem("iOfriendsawaytoonline")==1 ? friendliststatuses[i]=="Away" : false)) {notification(friendlist[i]);}
                        friendliststatuses[i] = "Online";
                    } else{
                        friendliststatuses[i] = "Offline";}}

                if (status == "absent") {
                    if (time() - timestamp < 180) {
                        if(friendliststatuses[i]=="Offline") {notification(friendlist[i]);}
                        friendliststatuses[i] = "Away";}
                    else{
                        friendliststatuses[i] = "Offline";}}

                if (status == "dnd") {
                    friendliststatuses[i] = "Offline";
                }

                if (friendliststatuses.toString().match(/Online/g) === null) {
                    chrome.browserAction.getBadgeText({}, function(result) {
                        console.log(result);
                        if(result!==" "){
                            chrome.browserAction.setBadgeText({text: ""});}
                    });
                }
                else {
                    chrome.browserAction.setBadgeText({text: String(friendliststatuses.toString().match(/Online/g).length)});}


            }
            if (getstatus.status === 403 && JSON.parse(getstatus.responseText).status==="incorrect key") {
                chrome.storage.sync.get("iOaccounts", function (data) {
                    oldkey = JSON.parse(data.iOaccounts).find(user => user.name === localuser).key;
                    if(oldkey==key){
                        indx = registeredUsers.findIndex(k => k.name === localuser);
                        chrome.storage.sync.set({"iOaccounts" : JSON.stringify(registeredUsers.slice(0, indx).concat({
                            "name": localuser,
                            "key": "changed"
                        }).concat(registeredUsers.slice(indx + 1)))},function(){location.reload();});
                    }
                    else{location.reload();}
                });
            }
            setTimeout(docheck, interval);}
    };

}


function notification(user) {
    if(localStorage.getItem("iOstatus")==="dnd"){console.log("nopee");return;}
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://api.scratch.mit.edu/users/" + user, true);
    xhttp.send();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            response = JSON.parse(xhttp.responseText);
            id = response.id;
            if(localStorage.getItem("iOfriendlistsound")!=0){audio.play();}
            var notification = new Notification(user+' is now online', {
                icon: "https://cdn2.scratch.mit.edu/get_image/user/"+id+"_90x90.png?"+Math.round(new Date().getTime()/1000),
                body: "Click to go to profile",
            });
            notification.onclick = function(){notification.close();window.open("https://scratch.mit.edu/users/"+user+"/");};
            setTimeout(function () {
                notification.close();
            }, 10000);
        }};
}

function checkfollowing(offset,user,localuser) {
    console.log("checkfollowing");
    var followinglist = new XMLHttpRequest();
    followinglist.open('GET', 'https://api.scratch.mit.edu/users/' + user + "/following?offset=" + offset, true);
    followinglist.send();
    followinglist.onreadystatechange = function() {
        if (followinglist.readyState === 4 && followinglist.status === 200) {
            response = JSON.parse(followinglist.responseText);
            console.log(response.length);
            if(response.length==0){couldNotAdd("You can only add users that are following you to your friend list");return;}
            for (i = 0; i < response.length; i++) {
                if(response[i].username.toLowerCase()===localuser.toLowerCase()){addToFriends(user);return;}
                if(i===response.length-1 && response.length!==20){couldNotAdd("You can only add users that are following you to your friend list");return;}
                if(i===response.length-1 && response.length===20){setTimeout(function(){checkfollowing(offset+20,user,localuser);},100);}
            }
        }};

}

function addToFriends(user) {
    friendlist.push(user);
    chrome.storage.sync.set({iOfriendlist : friendlist}, function(){anynotification("Added "+user+" to friend list","You'll now receive notifications when they get online.");setTimeout(function(){location.reload()},100);});
}

function couldNotAdd(message) {
    anynotification("Could not add to friend list",message);
}

function anynotification(title,body) {
    var notification = new Notification(title, {
        icon: "icon.png",
        body: body,
    });
}