// ---------------------------------------------------------------------------- //
// Class for the model (dgl)
// Contains every non state vector initial values and other functions
// of the model
// ---------------------------------------------------------------------------- //

#pragma once
#include <vector>
#include <array>
#include <string>
#include <iostream>
#include "timeDependentParameter.h"
#include <emscripten/val.h>
using namespace std;
using namespace emscripten;
//Our state vector has size one atm
typedef array<double, 7> SV;

// ---------------------------------------------------------------------------- //
// Main model class
// ---------------------------------------------------------------------------- //
class Model
{
public:
	Model();
	~Model();
	void set_initials(SV initials);
	void set_initials(double _S, double _E_Q, double _E_H, double _I_Q, double _I_H, double _I_Hs, double _R);
	SV dgl(double t, SV state);
	void clear(); //Clear the time hs h data

	// Name var can be used for file saveing...
	string name;

	// Parameters first order (time independent)
	double M;  						//Population size gets set on init

	double gamma 					//Recovery/removal rate
		= 0.10; 	  
	double xi		 					//Asymptomatic ratio
		= 0.32;
  double nu  	 					//Registered contacts (quarantined)
  	= 0.075;
	double lambda_r 			//Random testing rate
		= 0.0;
	double lambda_r_prime //Reduced random testing rate
		= 0.0;
	double lambda_s 			//Symptom driven testing rate
		= 0.25;
	double lambda_s_prime //symptom-driven testing rate in reduced capacity
		= 0.10;	
	double eta 						//Tracing efficiency
		= 0.66;
	double tau 						//Contact tracing delay
		= 2.0;
	double N_test_max 		//Maximal tracing capacity
		= 50.0;
	double epsilon 				//Leak factor (quarantined)
		= 0.05;
	double rho   					//Exposed-to-infectious rate
		= 0.25;
	double phi 						//ratio 
		= 0.38;
	double R_0						//Basic reproduction number
		= 3.3;

	SV init;

	// Parameters second order (time dependent)
	// small class which allows easy modeling
	TimeDependentParameter k{0.2}; // Contacts
	TimeDependentParameter Phi{0.1}; // Influx
	void set_k(TimeDependentParameter k);
	void set_Phi(TimeDependentParameter p);
	TimeDependentParameter get_Phi();
	TimeDependentParameter get_k();

	// Parameters thrid order (hard coded special behaviour or dependence
	// on other parameters)
	double chi_tau();
	double chi_sr();
	double chi_r();
	double I_H_max();
	double I_Hs_max();
	double N_test(double I_H, double I_Hs);
	double N_test_S(double I_Hs);
	double N_traced(double t);

	// Data vectors to save a part of the last calculations
	std::vector<double> time;
	std::vector<double> I_H_tau;
	std::vector<double> I_Hs_tau;
private:
};


// ---------------------------------------------------------------------------- //
// Data Struct for saving the timeseries of the state vector
// ---------------------------------------------------------------------------- //
struct data_struct{
	vector<double> time;
	vector<SV> system;

	vector<double> S;
	vector<double> E_Q;
	vector<double> E_H;
	vector<double> I_Q;
	vector<double> I_H;
	vector<double> I_Hs;
	vector<double> R;

	vector<double> N;
	vector<double> N_obs;

	void clear(){
		time.clear();
		system.clear();
		S.clear();
		E_Q.clear();
		E_H.clear();
		I_Q.clear();
		I_H.clear();
		I_Hs.clear();
		R.clear();
	};

	void push_back(double _time, SV _data){
		time.push_back(_time);
		system.push_back(_data);

		S.push_back(_data[0]);
		E_Q.push_back(_data[1]);
		E_H.push_back(_data[2]);
		I_Q.push_back(_data[3]);
		I_H.push_back(_data[4]);
		I_Hs.push_back(_data[5]);
		R.push_back(_data[6]);
	};
	//Memory view
	void calc_Ns(Model model);

	val get_N();
	val get_N_obs();
	val get_time();	//Declaration in communication cpp
	val get_S();
	val get_E_Q();
	val get_E_H();
	val get_I_Q();
	val get_I_H();
	val get_I_Hs();
	val get_R();

};
