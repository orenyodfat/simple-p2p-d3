var BACKEND_URL='http://localhost:8888';

var m = 0;
var s = 0;
var clockId;

var networkname           = "0";

var mockerlist            = [];
var mockerlist_generated  = false;
var defaultSim            = "default";
var selectedSim           = defaultSim;

var eventSource           = null;
var eventHistory          = [];
var currHistoryIndex      = 0;
var time_elapsed          = new Date();
var timemachine           = false;

var selectingTarget       = false;
var pollInterval          = false;
var chord                 = false;
var rec_messages          = false;
var selectDisconnect      = false;
var selectionActive       = false;

//counters
var upnodes               = 0;
var uplinks               = 0;

var eventCounter          = 0;
var msgCounter            = 0;
var nodeAddCounter        = 0;
var nodeRemoveCounter     = 0;
var connAddCounter        = 0;
var connRemoveCounter     = 0;



var startTimer = function () {
  clockId = setInterval(function(){
    s++;
    var temps= s%60;
    m = Math.floor(s/60);
    h = Math.floor(m/60);
    var val = "" + (h>9?"":"0") + h + ":" +(m>9?"":"0") + m + ":" + (temps>9?"":"0") + temps;
    $("#time-elapsed").text(val);
  },1000);
};

var resetTimer = function() {
  $("#time-elapsed").text("00:00:00");
  s=0;
}


$(document).ready(function() {
  
  //click handlers
  $('#power').on('click',function(){ 
    initializeServer(networkname); 
  });

  $('#stop').on('click',function(){ 
    if ($(this).hasClass("fa-stop")) {
      stopNetwork(); 
    } else {
      restartNetwork(); 
    }
    $("#status-messages").hide();
  });

  $("#pause").click(function() {
      pauseNetwork();
      //eventSource.close();
      //$("#status-messages").text("Visualization Paused");
      //$("#status-messages").show();
      //$("#timemachine").show();
      //pauseViz = true;
      //$('#pause').prop("disabled",true);
      //$('#play').prop("disabled",false);

      //setupTimemachine();
  });

  $("#rec-messages").change(function() {
    if(this.checked) {
      rec_messages = true;
    } else {
      rec_messages = false;
    }
  });

  $('.menuitem').on('click',function(){ 
    switch ($(this).attr("id")) {
      case "selectmocker": 
              selectMocker();
              $("menu").hide("slow");
              break;
      default: 
              selectMocker();
              break;
    }
  });


  $('#output-window').on('click',function(){ 
    if ($('#showlogs').is(":checked") ) {
      $('#output-window').toggleClass("closepane"); 
    }
  });

  $('#selected-simulation').text(selectedSim);

  //pollServer();
  setVisualisationFrame();
});

function setVisualisationFrame() {
  var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
    x = w.innerWidth || e.clientWidth || g.clientWidth,
    y = w.innerHeight|| e.clientHeight|| g.clientHeight;
  
  var viswidth = x * 60 / 100;
  var visheight = y * 85 / 100;
  $("#network-visualisation").attr("width", viswidth);
  $("#network-visualisation").attr("height", visheight);
}

function pollServer() {
  pollInterval = setInterval(function() {
  $.get(BACKEND_URL + "/alive").then(
    function(d) {
      console.log("Backend is running");
      $("#backend-nok").hide();
      $("#backend-ok").fadeIn().css('display', 'inline-block');
    },
    function(d) {
      console.log("Backend is NOT running");
      $("#backend-nok").show("slow");
      $("#backend-ok").hide("slow");
    }
   );
  }, 1000);
}

function setupEventStream() {
  eventSource = new EventSource(BACKEND_URL + '/networks/' + networkname + "/events");

  eventSource.addEventListener("network", function(e) {
    var event = JSON.parse(e.data);

    var graph = {
      add:     [],
      remove:  [],
      message: []
    };

    switch(event.type) {

      case "node":
        if (event.control) {
          return;
        }

        var el = {
          group: "nodes",
          data: {
            id: event.node.config.id,
            up: event.node.up
          },
          control: event.control
        };

        if (event.node.up) {
          graph.add.push(el);
          nodeAddCounter += 1;
          $("#nodes-add-count").text(nodeAddCounter);
        } else {
          graph.remove.push(el);
          nodeRemoveCounter += 1;
          $("#nodes-remove-count").text(nodeRemoveCounter);
        }

        break;

      case "conn":
        var el = {
          group: "edges",
          data: {
            id:     event.conn.one + "-" + event.conn.other,
            source: event.conn.one,
            target: event.conn.other,
            up:     event.conn.up
          },
          control: event.control
        };

        if (event.conn.up) {
          graph.add.push(el);
          connAddCounter += 1;
          $("#edges-add-count").text(connAddCounter);
        } else {
          graph.remove.push(el);
          connRemoveCounter += 1;
          $("#edges-remove-count").text(connRemoveCounter);
        }

        break;

      case "msg":
        msgCounter += 1;
        $("#msg-count").text(msgCounter);
        if (!rec_messages) {
          return;
        }
        graph.message.push({
          group: "msgs",
          data: {
            id:     event.msg.one + "-" + event.msg.other,
            source: event.msg.one,
            target: event.msg.other,
            up:     event.msg.up
          },
          control: event.control
        });

        break;

    }
    eventCounter++;
    updateVisualisationWithClass(graph);
    //console.log(eventCounter);
  });

  eventSource.onopen = function() {
    startViz(); 
  };

  eventSource.onerror = function() {
    $("#error-messages").show();
    $("#error-reason").text("Has the backend been shut down?");
    $('#pause').prop("disabled",true);
    $('#play').prop("disabled",true);
    $('#power').prop("disabled",false);
    $("#backend-nok").show("slow");
    $("#backend-ok").hide("slow");
    $(".display .label").text("Disconnected");

    clearInterval(clockId);
    //console.log(new Date());
  }
}

function selectMockerBackend(id) {
  selectedSim = id;
  $('#selected-simulation').text(selectedSim);
  funcClose();
}

function startViz(){
  $.post(BACKEND_URL + "/networks/" + networkname + "/mock/" + selectedSim).then(
    function(d) {
      startTimer();
      $(".display .label").text("Simulation running");
      //console.log(new Date());
      $("#rec_messages").attr("disabled",true);
      $("#stop").removeClass("invisible");
      $("#pause").removeClass("invisible");
  }, function(e) {
      $("#error-messages").show();
      $("#error-reason").text("Is the backend running?");
  })
}

function initializeServer(){
  initializeVisualisationWithClass(networkname);
  $("#error-messages").hide();
  $(".display").css({"opacity": "1"});
  $(".display .label").text("Connecting with backend...");
  $.post(BACKEND_URL + "/networks", JSON.stringify({Id: networkname})).then(
    function(d){
      //console.log("Backend POST init ok");
      //initializeMocker(networkname_);
      $(".elapsed").show();
      setupEventStream();
      clearInterval(pollInterval);
    },
    function(e,s,err) {
      $("#error-messages").show();
      $("#error-reason").text("Is the backend running?");
      $('#power').prop("disabled",false);
      $('#play').prop("disabled",true);
      $('#pause').prop("disabled",true);
      console.log("Error sending POST to " + BACKEND_URL + "/networks");
      console.log(e);
    });
};

function restartNetwork() {
  /*
  $.post(BACKEND_URL + "/networks/").then(
    function(d){
      startTimer();
      $(".display .label").text("Simulation running");
      $("#stop").removeClass("fa-play-circle");
      $("#stop").addClass("fa-stop");
      $("#show-conn-graph").hide();
      $("#rec_messages").attr("disabled",true);
    },
    function(e,s,err) {
      $("#error-messages").show();
      $("#error-reason").text("Is the backend running?");
      $('#power').prop("disabled",false);
      $('#play').prop("disabled",true);
      $('#pause').prop("disabled",true);
      console.log("Error sending POST to " + BACKEND_URL + "/networks");
      console.log(e);
    });
  */
  $("#stop").addClass("fa-stop");
  $("#stop").removeClass("fa-play-circle");
  d3.select("#network-visualisation").selectAll("*").remove();
  initializeServer();
  visualisation.sidebar.resetCounters();
};

function stopNetwork() {
  $(".display .label").text("Stop network: waiting for backend...");
  $("#stop").addClass("stale");
  $.ajax({
    url: BACKEND_URL + "/networks/" + networkname,
    type: "DELETE",
    data: {},
    contentType:'application/json',
    dataType: 'text', 
    success: function(d) {
      eventSource.close();
      clearInterval(clockId);
      resetTimer();
      $("#stop").removeClass("fa-stop");
      $("#stop").addClass("fa-play-circle");
      $("#show-conn-graph").removeClass("invisible");
      $(".display .label").text("Simulation stopped. Network deleted.");
      $("#rec_messages").attr("disabled",false);
      $("#stop").removeClass("stale");
    },
    error: function(d) {
      $(".display .label").text("Failed to stop network!");
      $("#stop").removeClass("stale");
    }
  });
}

function pauseNetwork() {
  $(".display .label").text("Pause network: waiting for backend...");
  $("#pause").addClass("stale");
  if ($("#pause").hasClass("paused")) {
    d3.select("#network-visualisation").selectAll("circle").remove();
    $.post(BACKEND_URL + "/networks/" + networkname + "/start").then(
      function(d) {
        startTimer();
        $("#show-conn-graph").addClass("invisible");
        $("#pause").removeClass("paused");
        $(".display .label").text("Simulation running.");
        $("#pause").removeClass("stale");
      },
      function(d) {
        $(".display .label").text("Continuing simulation failed!");
        $("#pause").removeClass("stale");
      });
  } else {
    $.post(BACKEND_URL + "/networks/" + networkname + "/stop").then(
      function(d) {
        clearInterval(clockId);
        $("#show-conn-graph").removeClass("invisible");
        $("#pause").addClass("paused");
        $(".display .label").text("Simulation paused. Network running.");
        $("#pause").removeClass("stale");
      },
      function(d) {
        $(".display .label").text("Pausing simulation failed!");
        $("#pause").removeClass("stale");
      });
  }
}

function showConnectionGraph() {
  putOverlay();
  chord = new P2PConnectionsDiagram();  
  chord.setupDiagram(false);
  var dialog = $("#connection-graph");
  var diagram = $("#chord-diagram");
  if (rec_messages) {
    $("#toggle-chord").removeClass("invisible");
  }
  dialog.show("slow");
  dialog.css({
          'margin-left': -diagram.outerWidth() / 2 + 'px',
          'margin-top':  -diagram.outerHeight() / 2 + 'px',
          'visibility': "visible"
  });
  $('#close').css({
          'left': dialog.position().left + dialog.outerWidth()/2 - 5 + 'px',
          'top':  dialog.position().top  - dialog.outerHeight()/2 -25 + 'px'
  });

} 


function selectMocker() {
  $.get(BACKEND_URL + "/networks/" + networkname + "/mock"). then(
    function(d) {
      console.log("Successfully retrieved mocker list");
      console.log(d);
      mockerlist = d;
      showSelectDialog();
    },
    function(e,s,err) {
      $("#error-messages").show();
      $("#error-reason").text("Failed to retrieve mocker list.");
      console.log(e);
    });
}

function showSelectDialog() {
  putOverlay();
  if (mockerlist_generated == true) {
    $("#select-mocker").show("slow");
  } else {
    var dframe = $(document.createElement('div'));
    dframe.attr("class","dialogframe");
    var table = $(document.createElement('table'));
    table.attr("class","objectlist");
    $.each(mockerlist, function(k,v) {
      var tr = $(document.createElement('tr'));
      tr.attr("class","selectelement");
      var td = $(document.createElement('td'));
      td.attr("id",k);
      td.click(function() { selectMockerBackend($(this).attr("id"));});
      td.append(v); 
      tr.append(td);
      table.append(tr);
    }) 
    dframe.append(table);
    var dialog = $("#select-mocker");
    dialog.append(dframe);
    dialog.css({
          'margin-left': -dialog.outerWidth() / 2 + 'px',
          'margin-top':  -dialog.outerHeight() / 2 + 'px',
          'visibility': "visible"
    });
    $('#close').css({
          'left': dialog.position().left + dialog.outerWidth()/2 - 5 + 'px',
          'top':  dialog.position().top  - dialog.outerHeight()/2 -25 + 'px'
    });
    dialog.show();
    mockerlist_generated = true;
  }
}

function putOverlay() {
  $('#Overlay').show();
}

function funcClose() {
  $("#Overlay").hide("slow");
  $(".ui-dialog").hide("slow");
}


//Mocker is currently not used for this visualization
function initializeMocker(networkname_) {
  $.post(BACKEND_URL + "/" + networkname_ + "/mockevents/").then(
    function(d){
      console.log("Backend initializeMocker OK");
    },
    function(e){
      console.log("Error initializing mockevents at " + BACKEND_URL + '0/mockevents/');
      console.log(e);
    })
};

function getGraphNodes(arr) {
   return arr.filter(function(i,e){return e.group === 'nodes'})
      .map(function(i,e){
        return {
          id: e.data.id,
          label: nodeShortLabel(e.data.id),
          control: e.control,
          visible: true,
          group: 1
       };
      }).toArray();
}

function getGraphLinks(arr) {
  return arr.filter(function(i,e){return e.group === 'edges' && !e.control} )
      .map(function(i,e){
        return {
          id: e.data.id,
          label: nodeShortLabel(e.data.id),
          control: e.control,
          source: e.data.source,
          target: e.data.target,
          visible: true,
          group: 1,
          value: i
        };
      }).toArray();
}

function initializeVisualisationWithClass(networkname_){
  this.visualisation = window.visualisation = new P2Pd3(d3.select("#network-visualisation"));
};


function updateVisualisationWithClass(graph) {
  var self = this;

  //console.log("Updating visualization with new graph");
  eventHistory.push({timestamp:$("#time-elapsed").text(), content: graph});
  
  var objs = [graph.add, graph.remove, graph.message];
  var act  = [ "ADD", "REMOVE", "MESSAGE" ];
  for (var i=0;i<objs.length; i++) {
    for (var k=0; objs[i] && k<objs[i].length; k++) {
      var obj = objs[i][k];
      var str = act[i] + " - " + obj.group + " Control: " + obj.control + " - " + obj.data.id + "</br>";
      $("#log-console").append(str);
    }
  } 

  var elem = document.getElementById('output-window');
  elem.scrollTop = elem.scrollHeight;

  $('#node-kademlia-table').addClass("stale");
  //new nodes
  var newNodes = getGraphNodes($(graph.add));
  //new connections 
  var newLinks = getGraphLinks($(graph.add));
  //down nodes
  var removeNodes = getGraphNodes($(graph.remove));
  //down connections 
  var removeLinks = getGraphLinks($(graph.remove));

  var triggerMsgs = false;
  if (rec_messages) { 
    triggerMsgs = $(graph.message)
        .map(function(i,e){
          return {
            id: e.data.id,
            source: e.data.source,
            target: e.data.target,
            group: 1,
            value: i
          };
        })
        .toArray();
  } 

  self.visualisation.updateVisualisation(newNodes,newLinks,removeNodes,removeLinks,triggerMsgs);
};


function showMenu() {
  $('menu').show();
}
