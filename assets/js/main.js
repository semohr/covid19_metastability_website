// Slider and highchart init are run at the same time.
// Once the sliders, highcharts and the wasm module is setup we run our model!
// -> Check sliders
// -> Update model params
// -> run
// -> Update charts

var t_max = 145.0;
// ---------------------------------------------------------------------------- //
// Model
// ---------------------------------------------------------------------------- //
var wasm_init = false;
Module['onRuntimeInitialized'] = function() {
  console.log("model wasm loaded");
  wasm_init = true;
}

//GLOBAL model objects i.e. a instance of our cpp model class and for 
// the data, solver and initial values.
var data;

/*Run load function on load of website sometime wasm loads in strange behaviour or
is not fully loaded on the 'load' event so we make an additional check for that*/
window.addEventListener("load", setup_model);
function setup_model(){
  if (!wasm_init || !slider_init || !highchart_init){
    setTimeout(setup_model, 10);
    return;
  }

  model_run();
}
function model_run(){
  //Create model instance
  var model = new Module.Model();

  //Get parameters from parameters dict
  var params = {}
  for (key in parameters) {
    params[key] = parseFloat(parameters[key]["value"])
  }
  for (key in main_parameters) {
    if (key == R) continue;
    params[key] = parseFloat(main_parameters[key]["value"])
  }
  for (key in spezial){
    params[key] = spezial[key]["cpp"]
  }
  model = update_model_params(model,params);
  //Create solver from model
  var solver = new Module.Solver(model);

  //Get initial_values
  var init = {}
  for (key in initials) {
    init[key] = parseFloat(initials[key]["value"])
  }

  //
  init["R"] =  parseFloat(main_parameters["R"]["value"]*1e6*100)

  //Always 1e6 Susceptible
  init["S"] = 1e6- init["E_Q"] - init["E_H"] - init["I_Q"] - init["I_H"];
  //Run solver
  solver.run(
    init["S"],init["E_Q"],init["E_H"],init["I_Q"],init["I_H"],init["I_Hs"],init["R"],
    t_max
    );

  //Save data to global object
  var dat = solver.get_data();
  save_data(model,dat);

  //Update highcharts series
  update_highcharts_series();
}


function update_model_params(model, kwargs) {
  /*"""
  Update model with parameters or intitials
  by kwargs key and value.

  """*/
  var model_parameters =[
  "gamma","xi","nu",
  "lambda_r","lambda_r_prime",
  "lambda_s","lambda_s_prime",
  "eta","tau","N_test_max","epsilon",
  "rho","phi","R_0","Phi_t","k_t"];

  for (var key in kwargs){
    if(model_parameters.includes(key)){
      model[key] = kwargs[key]
    }
  }
  return model
}


function save_data(model,dat){
  /* Save data from model run to readable series format
  for highcharts
    */
  var time = dat.time();
  var New_cases = [];
  var New_cases_obs = [];

  var Repro_number = [];
  var Repro_number_eff = [];

  var S = [];
  var E_Q = [];
  var E_H = [];
  var I_Q = [];
  var I_H = [];
  var I_Hs = [];
  var R = [];

  for(let i = 0; i < time.length; i++){
    //New cases
    New_cases.push([time[i],dat.N()[i]]);
    New_cases_obs.push([time[i],dat.N_obs()[i]]);

    //reproduction numbers
    if (i>=4) {
      Repro_number.push([time[i],dat.N()[i]/dat.N()[i-4]]);
      Repro_number_eff.push([time[i],dat.N_obs()[i]/dat.N_obs()[i-4]])
    }
  
    //compartments
    S.push([time[i],dat.S()[i]]);
    E_Q.push([time[i],dat.E_Q()[i]]);
    E_H.push([time[i],dat.E_H()[i]]);
    I_Q.push([time[i],dat.I_Q()[i]]);
    I_H.push([time[i],dat.I_H()[i]]);
    I_Hs.push([time[i],dat.I_Hs()[i]]);
    R.push([time[i],dat.R()[i]]);
  }

  data = { 
    "NewCases" :
      [
        {
          name: "New cases",
          data: New_cases,
          dashStyle: 'DashDot',
        },
        {
          name: "New cases observed",
          data: New_cases_obs,
          dashStyle: 'Line',        
        },
      ],
    "Rs" : 
      [{
        name: "Reproduction number",
        dashStyle: 'DashDot',
        data: Repro_number,
      },
      {
        name: "Observed reproduction number",
        dashStyle: 'Line',
        data: Repro_number_eff,      
      },        
      ],
    "Compartments" :
      [{
        name: "Exposed (quarantined)",
        data: E_Q,
      },{
        name: "Exposed (hidden)",
        data: E_H,
      },{
        name: "Infectious (quarantined)",
        data: I_Q,        
      },{
        name: "Infectious (hidden)",
        data: I_H, 
      },{
        name: "Infectious (hidden, symptomatic)",
        data: I_Hs, 
      },{
        name: "Susceptible",
        data: S,         
      },{
        name: "Recovered",
        data: R,        
      }
      ]
  }
}

var main_parameters = {
  "lambda_r" : {
    "id" : "lambda_r",
    "name": "Random-testing rate",
    "math": "&lambda;<sub>r</sub>",
    "min": 0.00,
    "max": 0.20,
    "value": 0.0,
    "description": "Fraction of the population randomly tested per day."
  },
  "lambda_s" : {
    "id" : "lambda_s",
    "name": "Symptom-driven testing rate",
    "math": "&lambda;<sub>s</sub>",
    "min": 0.00,
    "max": 1.00,
    "value": 0.25,
    "description": "Fraction of the symptomatic population tested per day."
  },
  "eta" : {
    "id" : "eta",
    "name": "Tracing efficiency",
    "math": "&eta;",
    "min": 0.01,
    "max": 1.00,
    "value": 0.66,
    "description": "Fractions of infection chains that are fully traced."
  },
  "N_test_max" : {
    "id" : "N_test_max",
    "name": "Maximal tracing capacity",
    "math": "N<sub>test,max</sub>",
    "min": 0.0,
    "max": 100.0,
    "value": 50,
    "description": "The maximum amount of new cases whose close contacts can be timely found by Health Authorities. If case numbers cross the maximal tracing capacity, TTI efficiency is reduced."
  },
  "R_0" : {
    "id" : "R_0",
    "name": "Basic reproduction number",
    "math": "R<sub>0</sub>",
    "min": 0.0,
    "max": 6.0,
    "value": 3.3,
    "description": " The basic reproduction number accounts for the number of offspring infections a single case can produce in a fully susceptible and naïve population. It is a property of each infection, and does not change unless the infection does (e.g., in the case of emerging variants)."
  },
  "R" : {
    "id" : "R",
    "name": "Recovered pool (fraction of immune population)",
    "math": "R",
    "min": 0.0,
    "max": 1.0,
    "value": 0,
    "step" : 0.01,
    "description": " Individuals that have acquired immunity against SARS-CoV-2 infection, due to vaccination or to recovery from disease."
  },
}

var parameters = {
  "gamma" : {
    "id" : "gamma",
    "name": "Recovery/removal rate",
    "math": "&gamma;",
    "min": 0.08,
    "max": 0.12,
    "value": 0.10,
    "description": "TODO"
  },
  "xi" : {
    "id" : "xi",
    "name": "Asymptomatic ratio",
    "math": "&xi;",
    "min": 0.15,
    "max": 0.45,
    "value": 0.32,
    "description": "TODO"
  },
  "nu" : {
    "id" : "nu",
    "name": "Registered contacts (quarantined)",
    "math": "&nu;",
    "min": 0.01,
    "max": 0.15,
    "value": 0.075,
    "description": "TODO"
  },
  "lambda_r_prime" : {
    "id" : "lambda_r_prime",
    "name": "Random-testing rate (reducedcapacity)",
    "math": "&lambda;<sub>r</sub><sup>'<sup>",
    "min": 0.00,
    "max": 0.20,
    "value": 0.0,
    "description": "TODO"
  },
  "lambda_s_prime" : {
    "id" : "lambda_s_prime",
    "name": "Symptom-driven testing rate (reducedcapacity)",
    "math": "&lambda;<sub>s</sub><sup>'<sup>",
    "min": 0.00,
    "max": 1.00,
    "value": 0.1,
    "description": "TODO"
  },
  "tau" : {
    "id" : "tau",
    "name": "Contact tracing delay",
    "math": "&tau;",
    "min": 0.0,
    "max": 5.0,
    "value": 2,
    "description": "TODO"
  },
  "epsilon" : {
    "id" : "epsilon",
    "name": "Lost contacts (quarantined)",
    "math": "&epsilon;",
    "min": 0.0,
    "max": 0.5,
    "value": 0.05,
    "description": "TODO"
  },
  "rho" : {
    "id" : "rho",
    "name": "Exposed-to-infectious rate",
    "math": "&rho;",
    "min": 0.0,
    "max": 0.5,
    "value": 0.25,
    "description": "TODO"
  },
  "phi" : {
    "id" : "phi",
    "name": "Ratio symptomatic hidden to symptomatic (I pool)",
    "math": "&phi;",
    "min": 0.0,
    "max": 1.0,
    "value": 0.4,
    "description": "TODO"
  },
}

var initials = {
  "E_Q" : {
    "id" : "E_Q",
    "name": "Exposed pool (quarantined)",
    "math": "E<sup>Q</sup>",
    "min": 0.0,
    "max": 500,
    "value": 100,
    "step" : 1,
    "description": "TODO"
  },
  "E_H" : {
    "id" : "E_H",
    "name": "Exposed pool (hidden)",
    "math": "E<sup>H</sup>",
    "min": 0.0,
    "max": 500,
    "value": 100,
    "step" : 1,
    "description": "TODO"
  },
  "I_Hs" : {
    "id" : "I_Hs",
    "name": "Infectious pool (hidden, symptomatic)",
    "math": "I<sup>H,s</sup>",
    "min": 0.0,
    "max": 500,
    "value": 68,
    "step" : 1,
    "description": "TODO"
  },
  "I_H" : {
    "id" : "I_H",
    "name": "Infectious pool (hidden)",
    "math": "I<sup>H</sup>",
    "min": 0.0,
    "max": 500,
    "value": 100,
    "step" : 1,
    "description": "TODO"
  },
  "I_Q" : {
    "id" : "I_Q",
    "name": "Infectious pool (quarantined)",
    "math": "I<sup>Q</sup>",
    "min": 0.0,
    "max": 500,
    "value": 100,
    "step" : 1,
    "description": "TODO"
  },  
}
// Special parameters contact k and influx phi
var spezial = {
  "k_t" : {
    "id" : "k_t",
    "name": "Intensity of contagious contacts",
    "math": "k<sub>t</sub>",
    "min": 0.0,
    "max": 1.0,
    "value": 0.2,
    "description": "Modulation parameter for defining the potentially changing contact behaviour of the population.",
    "change_points": 0,
    "peak" : 0,
  },
  "Phi_t" : {
    "id" : "Phi_t",
    "name": "External influx",
    "math": "&phiv;<sub>t</sub>",
    "min": 0.0,
    "max": 10.0,
    "value": 1.,
    "description": "Number of new infections added by external influx.",
    "change_points": 0,
    "peak" : 0,
  }
}


// ---------------------------------------------------------------------------- //
// Parameter sliders
// ---------------------------------------------------------------------------- //
slider_init = false;
function _add_sliders_to_div(main_div, parameter){
  /*
  Function to add a slider to a div
  */
  //We create two divs one for the header and one for the slider
  var header_div = document.createElement("div");
  var slider_div = document.createElement("div");

  //Add classes to slider and header
  header_div.classList.add("row","form-header")
  slider_div.classList.add("form-linked-inputs", "d-flex", "align-items-center")


  //Construct inner header
  var inner_header_description = document.createElement("label");
  inner_header_description.classList.add("form-label","col");
  inner_header_description.innerHTML = `${parameter["name"]}
  <i class="far fa-question-circle" title='${parameter["description"]}' data-toggle="tooltip" tabindex="0" data-html="true" ></i>
  `;

  var inner_header_math = document.createElement("label");
  inner_header_math.classList.add("form-label","col");
  inner_header_math.innerHTML = `<math> ${parameter["math"]}</math>`;

  header_div.appendChild(inner_header_description)
  header_div.appendChild(inner_header_math)
  
  //Construct inner slider
  var inner_slider_range = document.createElement("input");
  inner_slider_range.classList.add("form-range")
  inner_slider_range.id = parameter["id"]
  inner_slider_range.type = "range"
  inner_slider_range.min = parameter["min"]
  inner_slider_range.max = parameter["max"]
  if ("step" in parameter){
    inner_slider_range.step = parameter["step"]
  }
  else{
    inner_slider_range.step = 0.001
  }
  
  inner_slider_range.value = parameter["value"]


  var inner_slider_number = document.createElement("input");
  inner_slider_number.classList.add("form-number")
  inner_slider_number.id = parameter["id"]
  inner_slider_number.type = "number"
  inner_slider_number.min = parameter["min"]
  inner_slider_number.max = parameter["max"]
  if ("step" in parameter){
    inner_slider_range.step = parameter["step"]
  }
  else{
    inner_slider_range.step = 0.001
  }
  inner_slider_number.value = parameter["value"]

  //Event to update global dicts
  inner_slider_range.addEventListener('input', function(e){
    parameter["value"] = parseFloat(e.target.value);
    throttle(model_run());
  }.bind(parameter));
  inner_slider_number.addEventListener('input', function(e){
    parameter["value"] = parseFloat(e.target.value);
    throttle(model_run());
  }.bind(parameter));
  
  slider_div.appendChild(inner_slider_range)
  slider_div.appendChild(inner_slider_number)


  // Add to main div
  main_div.appendChild(header_div)
  main_div.appendChild(slider_div)
}

function _setup_modulation_parameter(main_div, parameters){
  /*
  Two cards one for the parameters and one for the plot
  of the parameter.

  -> Button to add changepoints and button to add influx
  */

  function create_initial_chart_drag_and_drop(div, parameter){
    //If div has no id generate one
    if (div.id == ""){
      div.id="chartcontainer"+String(Math.random()*450001);
    }

    //Get data for parameter line
    data_ar = [];
    for(let t = 0;t < t_max; t++){
      data_ar[t] = parameter["cpp"].eval(t)
    }
    
    //Create drag and drop chart
    var myChart = Highcharts.chart(div.id,{
    title: "",
    yAxis: {
        min: parameter["min"],
        max: parameter["max"],
        title: {
          text:parameter["math"],
          useHTML: true,
        },
    },
    xAxis: {
        title: {
          text: "Time in days",
          useHTML: true,
        },
    },
    tooltip: {
        valueDecimals: 2
    },

    series:[
      {
        //First series for showing the change
        stickyTracking: false,
        showInLegend: false,
        marker: {
          enabled: false
        },
        data: data_ar,
        lineWidth:3,
      }],

    credits:{
      enabled: false,
    },
    });

    charts[parameter["id"]] = myChart;
  }

  function set_classes(button, inner_html){
    button.type="button";
    button.classList.add("btn", "btn-secondary");
    button_influx.classList.add("btn", "btn-secondary");
    button.innerHTML = inner_html;
  }


  function on_click_cp(event,parameter){
    //Get chart
    let chart = charts[parameter["id"]];
    console.log("hi")
    //Create an changepoint
    parameter["cpp"].add_change(12.5,5.0,parameter["cpp"].initial);

    //Count number of cps
    parameter["change_points"] ++;


    let series = chart.addSeries({
        stickyTracking: false,
        dragDrop: {
            draggableX: true,
            draggableY: true,
            dragMaxY: parameter["max"],
            dragMinY: parameter["min"]
        },
        data: [{
            name: "Bound 1",
            x: 10,
            y: parameter["cpp"].initial,
          },
          {
            name: "Bound 2",
            x: 15,
            y: parameter["cpp"].initial,            
        }],
        name: "Change point "+String(parameter["change_points"]),
        lineWidth: 0,
        states: {
          hover: {
              lineWidthPlus: 0
          }
        },
        marker:{
          radius: 7.5,
          symbol: 'diamond',
          enabled: true,
        },
        cursor: 'move',
        point: {
          stickyTracking: false,
          events: {
            drag: function (e) {
              //update time_series_parameter
              min_y = this.series.dataMin;
              max_y = this.series.dataMax;
              
              if (this.series.data[0].x > this.series.data[1].x){
                min_x = this.series.data[1].x
                max_x = this.series.data[0].x
              }
              else{
                min_x = this.series.data[0].x
                max_x = this.series.data[1].x                
              }
              delta = Math.abs(this.series.data[0].x - this.series.data[1].x);

              let cp_index = 0;
              for(let i = 0; i<this.series.index;i++){
                if(chart.series[i].name.includes("Change point")){
                  cp_index ++;
                }
              }

              if (cp_index == 0) {
                //Update initial value
                parameter["cpp"].initial = this.series.data[0].y;
              }

              //Update
              parameter["cpp"].update_change(cp_index, min_x + delta/2, delta, this.series.data[1].y);

              //Update main series
              let data_update = []
              for(let t = 0; t < t_max; t++){
                data_update[t] = parameter["cpp"].eval(t);
              }
              chart.series[0].update({data:data_update});
              throttle(model_run());
            }
          }
        }
    })
  }

  function on_click_inf(event,parameter){
    //Get chart
    let chart = charts[parameter["id"]];

    //Create an inputevent
    parameter["cpp"].add_inputevent(12.5,0.0,0.5);

    //Count number of peak
    parameter["peak"] ++;

    let series = chart.addSeries({
        stickyTracking: false,
        dragDrop: {
            draggableX: true,
            draggableY: true,
            dragMaxY: parameter["max"],
            dragMinY: parameter["min"]
        },
        data: [{
            name: "Bound 1",
            x: 10,
            y: 0.0,
          },
          {
            name: "Bound 2",
            x: 9.5,
            y: 0.5,            
        }],
        name: "Peak "+String(parameter["peak"]),
        lineWidth: 0,
        states: {
          hover: {
              lineWidthPlus: 0
          }
        },
        marker:{
          radius: 7,
          symbol: 'square',
          enabled: true
        },
        point: {
          stickyTracking: false,
          events: {
            drag: function (e) {
              //update time_series_parameter
              min_y = this.series.dataMin;
              max_y = this.series.dataMax;
              mean = this.series.data[0].x
              change = this.series.data[0].y-this.series.data[1].y
              variance = Math.abs(this.series.data[0].x-this.series.data[1].x)
              let inf_index = 0;
              for(let i = 0; i<this.series.index;i++){
                if(chart.series[i].name.includes("Inputevent")){
                  inf_index ++;
                }
              }

              parameter["cpp"].update_inputevent(inf_index, mean, variance, change);

              //Update main series
              let data_update = []
              for(let t = 0; t < t_max; t++){
                data_update[t] = parameter["cpp"].eval(t);
              }
              chart.series[0].update({data:data_update});
              throttle(model_run());
            }
          }
        }
    })
  }

  let count = 1;
  for (key in parameters){
    let parameter = parameters[key];
    parameter["cpp"] = new Module.TimeDependentParameter(parameter["value"]);
    /* 
    Create visuals i.e. header, buttons, and chart
    -------------------------------------
    */

    //## Header
    var header_div = document.createElement("div");
    header_div.classList.add("row","form-header")
    var inner_header_description = document.createElement("label");
    inner_header_description.classList.add("form-label","col");
    inner_header_description.innerHTML = `${parameter["name"]}
    <i class="far fa-question-circle" title='${parameter["description"]}' data-toggle="tooltip" tabindex="0" data-html="true" ></i>
    `;
    var inner_header_math = document.createElement("label");
    inner_header_math.classList.add("form-label","col");
    inner_header_math.innerHTML = `<math> ${parameter["math"]}</math>`;
    header_div.appendChild(inner_header_description);
    header_div.appendChild(inner_header_math);
    main_div.appendChild(header_div);

    //## Buttons
    var button_div = document.createElement("div");
    button_div.classList.add("modulation-param-buttons");    
    var button_cp = document.createElement("button");
    var button_influx = document.createElement("button");

    set_classes(button_cp,"Add change point")
    set_classes(button_influx,"Add peak")
    button_cp.addEventListener("click",function(e){on_click_cp(e,parameter)}.bind(parameter))
    button_influx.addEventListener("click",function(e){on_click_inf(e,parameter)}.bind(parameter))

    //Append buttons to div
    button_div.appendChild(button_cp);
    button_div.appendChild(button_influx);
    //Append button div to main div
    main_div.appendChild(button_div);

    //Create drag and drop chart div
    var chart_div = document.createElement("div");
    chart_div.classList.add("modulation-param-chart");
    //Append to main div
    main_div.appendChild(chart_div);
    if (count != Object.keys(parameters).length){
      main_div.appendChild(document.createElement("hr"));
    }
    //Create highchart
    create_initial_chart_drag_and_drop(chart_div,parameter);
    count ++;
  }
}


function old(){
  var parameter_div = document.createElement("div");

  //Add initial button(s) to parameter div
  for (key in parameters){
    if (key != "change_points" && key != "influx"){
      _add_sliders_to_div(parameter_div, parameters[key])
    }
  }

  //Add events to create cps and influx to the buttons
  button_cp.addEventListener("click", function(){
    // We add the sliders for 
    // center, value after and length
    var l = Object.keys(parameters["change_points"]).length/3;
    
    //Construct parameters for the change_point
    var center = {
      "id": var_math+"_c_"+l,
      "name": "Center of change point "+l,
      "math": "",
      "min": 0.0,
      "max": 500.0,
      "value": 0,
      "description": "TODO"
    };
    var length = {
      "id": var_math+"_l_"+l,
      "name": "Length of change point "+l,
      "math": "",
      "min": 0.0,
      "max": 50.0,
      "value": 1.5,
      "description": "TODO"     
    };
    var change = {
      "id": var_math+"_delta_"+l,
      "name": "Value after change point "+l,
      "math": "",
      "min": 0.0,
      "max": 1.0,
      "value": 0.6,
      "description": "TODO"     
    };
    parameters["change_points"][center["id"]] = center;
    parameters["change_points"][length["id"]] = length;
    parameters["change_points"][change["id"]] = change;
    //Add them to
    parameter_div.appendChild(document.createElement("hr"))
    _add_sliders_to_div(parameter_div, center);
    _add_sliders_to_div(parameter_div, length);
    _add_sliders_to_div(parameter_div, change);

    setup_tooltips();
    create_interactive_forms();
  }.bind(parameters, parameter_div, var_math)
  );
  button_influx.addEventListener("click", function(){
    // We add the sliders for 
    // center, value after and length
    var l = Object.keys(parameters["influx"]).length/3;
    
    //Construct parameters for the change_point
    var mean = {
      "id": var_math+"_m_"+l,
      "name": "Mean/location of influx event "+l,
      "math": "",
      "min": 0.0,
      "max": 500.0,
      "value": 0,
      "description": "TODO"
    };
    var variance = {
      "id": var_math+"_v_"+l,
      "name": "Variance of influx event "+l,
      "math": "",
      "min": 0.0,
      "max": 2.0,
      "value": 0.5,
      "description": "TODO"     
    };
    var change = {
      "id": var_math+"_c_"+l,
      "name": "Change/scale of influx event "+l,
      "math": "",
      "min": 0.0,
      "max": 10.0,
      "value": 4,
      "description": "TODO"     
    };
    parameters["influx"][mean["id"]] = mean;
    parameters["influx"][variance["id"]] = variance;
    parameters["influx"][change["id"]] = change;
    //Add them to
    var hr = document.createElement("hr")
    parameter_div.appendChild(hr)
    _add_sliders_to_div(parameter_div, mean);
    _add_sliders_to_div(parameter_div, variance);
    _add_sliders_to_div(parameter_div, change);

    setup_tooltips();
    create_interactive_forms();
  }.bind(parameters, parameter_div, var_math));


  //Append buttons to div
  button_div.appendChild(button_cp);
  button_div.appendChild(button_influx);

  //Append button div to main div
  main_div.appendChild(button_div);

  //Append horizontal line and add a div for the sliders
  var hr = document.createElement("hr");
  main_div.appendChild(hr);

  //Append parameter dic to main div
  main_div.appendChild(parameter_div);
}

window.addEventListener("load", setup_parameter_sliders);
function setup_parameter_sliders(){
  if (!wasm_init || !highchart_init){
    setTimeout(setup_parameter_sliders, 10);
    return;
  }  

  // Main model parameters
  // Hard defined parameters
  var main_div = document.getElementById("main_parameters");
  let count = 1;
  for (key in main_parameters) {
    _add_sliders_to_div(main_div, main_parameters[key])
    
    if (count != Object.keys(main_parameters).length){
      main_div.appendChild(document.createElement("hr"))
    }
    count++;
  }
  set_sliders_to_dict(main_div,"main_parameters");


  //Model parameters
  var main_div = document.getElementById("parameters");

  count = 1;
  for (key in parameters) {
    _add_sliders_to_div(main_div, parameters[key])

    if (count != Object.keys(parameters).length){
      main_div.appendChild(document.createElement("hr"))
    }
    count++;
  }
  set_sliders_to_dict(main_div,"parameters");


  //Initial values
  count = 1;
  var main_div = document.getElementById("initials");
  for(key in initials){
    _add_sliders_to_div(main_div, initials[key])
    if (count != Object.keys(initials).length){
      main_div.appendChild(document.createElement("hr"))
    }
    count++;
  }
  set_sliders_to_dict(main_div,"initials");

  //Lockdown modulation
  var main_div = document.getElementById("contact");
  _setup_modulation_parameter(main_div,spezial)
  set_sliders_to_dict(main_div,"contact");
  create_interactive_forms();
  slider_init=true;
}

function set_sliders_to_dict(main_div, parameter_name){
  /*
  Updates the slider values in the main div.
  */
  var inputs = main_div.querySelectorAll("input");
  for (input of inputs){
    //Get paramer by id
    if(input.parameter_type == "change_points"){
      input.value = window[parameter_name]["change_points"][input.id]["value"]
    }
    else if (input.parameter_type == "influx") {
      input.value = window[parameter_name]["influx"][input.id]["value"]
    }
    else{
      input.value = window[parameter_name][input.id]["value"]
    }
  }
}



// ---------------------------------------------------------------------------- //
// Highcharts
// ---------------------------------------------------------------------------- //
window.charts = {}
highchart_init = false;
function _add_highchart_to_div(main_div,chart_params){
  //Create chart div
  var chartDiv = document.createElement('div');
  chartDiv.className = 'chart';
  // Append chart div to main chart
  main_div.appendChild(chartDiv);



  //Create default chart
  var myChart = Highcharts.chart(chartDiv,{
    title: {
      text: chart_params["title"],
    },
    chart: {
        spacingTop: 20,
        spacingBottom: 20,
    },
    credits: {
      enabled: true
    },
    plotOptions:{
      series: {
        marker: {
          symbol: "circle",
          enabled: false //Disable markers
        },
        lineWidth: 4,
      }
    },
    tooltip: {
      headerFormat: 'Day {point.key}<br/>',
      pointFormat: '{series.name}: <b>{point.y:.2f}</b><br/>',
      shared: true
    },
    legend:{
      symbolWidth: 40
    },
    series: chart_params["data_placeholder"], //For some strange reason one needs placeholders here
    xAxis: {
      title: {
        text: 'Time in days',
      },
      min: 10,
    },
    yAxis: {
      title:{
        text: chart_params["label_yAxis"],
      },
      ceiling: chart_params["ymax"],
    },
    credits:{
      enabled:false,
    },
  });
  window["charts"][chart_params["id"]] = myChart;
}

window.addEventListener("load", setup_highcharts);
function setup_highcharts(){

  Highcharts.setOptions({
    chart: {
        style: {
            fontFamily: 'sans-serif',
            color: "#212529"
        }
    },
    title: {
      style: {
        color: '#212529',
        font: 'bold 16px "sans-serif"'
      }
    },
    xAxis: {
      lineWidth: 2,
      lineColor: "#212529",
      labels: {
        style: {
          color: '#212529',
          font: 'sans-serif'
        }
      },
      title: {
        style: {
          color: '#212529',
          fontSize: '12px',
          fontFamily: 'sans-serif'

        }            
      }
    },
    yAxis: {
      lineWidth: 2,
      lineColor: "#212529",
      labels: {
        style: {
          color: '#212529',
          font: 'sans-serif'
        }
      },
      title: {
        style: {
          color: '#212529',
          fontSize: '12px',
          fontFamily: 'sans-serif'
        }            
      }
    },
  });




  let charts_params = {
    "NewCases":{
      "id":"NewCases",
      "title": "Daily new cases",
      "ymin": 0,
      "ymax": 1000,
      "label_yAxis": "Daily cases per million",
      "data_placeholder": [
        {visible: false},
        {visible: true},
      ],
    },
    "Rs":{
      "id":"Rs",
      "title": "Reproduction number",
      "ymin": 0,
      "ymax": 1000,
      "label_yAxis": "Reproduction number",
      "data_placeholder": [
        {visible: false},
        {visible: true},
      ],
    },
    "Compartments":{
      "id":"Compartments",
      "title": "Model compartments",
      "ymin": 0,
      "ymax": 1e6,
      "label_yAxis": "Pool size",
      "data_placeholder": [
        {visible: true},
        {visible: true},
        {visible: true},
        {visible: true},
        {visible: true},
        {visible: false},
        {visible: false},
      ],
    }
  }


  var main_div = document.getElementById("hs-container");
  for (key in charts_params){
    _add_highchart_to_div(main_div,charts_params[key]);
  }
  
  highchart_init = true;
}

function update_highcharts_series(){
  for (key of ["NewCases","Rs","Compartments"]) {
    charts[key].update({
      series: data[key],
    });
    charts[key].redraw();
  }
  
}


// ---------------------------------------------------------------------------- //
// Owd data
// ---------------------------------------------------------------------------- //
owd_init = false;
function plot_data_owd(){
  if (!owd_init){
    setTimeout(plot_data_owd, 100);
    return;
  }
  var end = new Date(2020,10,10)
  var begin = new Date(2020,5,17)

  

  var dat = get_owd_data_by_country_tag("DEU",begin,end);

  charts["NewCases"].addSeries({
    name: "Cases Germany",
    data: dat,
  });
  charts["NewCases"].redraw();
}

var owd;
window.addEventListener("load", download_owd);
function download_owd(){
  var requestURL = 'https://covid.ourworldindata.org/data/owid-covid-data.json';
  var request = new XMLHttpRequest();
  request.open('GET', requestURL);
  request.responseType = 'json';
  request.send();
  request.onload = function() {
    owd = request.response;
    console.log("Downloaded owd data");
    owd_init = true;
  }
}

function get_owd_data_by_country_tag(tag, begin, end){
  /* Gets owd data as tight array i.e. [[day,cases per million]]
  */
  var dat = [];
  var count = 0;
  for(let x = 0; x < owd[tag]["data"].length; x++){
    date = owd[tag]["data"][x]["date"].split("-")
    date = new Date(parseInt(date[0]),parseInt(date[1])-1,parseInt(date[2]));
    if (date<end && date>begin) {
      dat.push(owd[tag]["data"][x]["new_cases_per_million"]);
      count++;
    }
  }
  return movingAvg(dat,7);
}
