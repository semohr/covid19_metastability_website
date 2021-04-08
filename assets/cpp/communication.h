#pragma once
#include "src/solver.h"
#include "src/utils.h"
#include "src/model.h"
#include "src/timeDependentParameter.h"
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
using namespace emscripten;
// ---------------------------------------------------------------------------- //
// Utils
// ---------------------------------------------------------------------------- //

// ---------------------------------------------------------------------------- //
// Data struct
// ---------------------------------------------------------------------------- //

EMSCRIPTEN_BINDINGS(data) {
	class_<data_struct>("data_struct")
		.constructor<>()

		//Function for each compartment
		.function("time",&data_struct::get_time)

		//Total pools
		.function("S", &data_struct::get_S)
		.function("E_Q", &data_struct::get_E_Q)
		.function("E_H", &data_struct::get_E_H)
		.function("I_Q", &data_struct::get_I_Q)
		.function("I_H", &data_struct::get_I_H)
		.function("I_Hs", &data_struct::get_I_Hs)
		.function("R", &data_struct::get_R)
		.function("N", &data_struct::get_N)
		.function("N_obs", &data_struct::get_N_obs);

	register_vector<double>("vector<double>");
}



// ---------------------------------------------------------------------------- //
// TimeDependentParameter
// ---------------------------------------------------------------------------- //

EMSCRIPTEN_BINDINGS(timeDependentParameter) {
	class_<TimeDependentParameter>("TimeDependentParameter")
		.constructor<double>()

		//Vars
		.function("eval",&TimeDependentParameter::operator())
		.function("add_change",select_overload<void(double,double,double)>(&TimeDependentParameter::add_change))
		.function("add_inputevent",select_overload<void(double,double,double)>(&TimeDependentParameter::add_inputevent))
		.function("update_change",select_overload<void(int,double,double,double)>(&TimeDependentParameter::update_change))
		.function("update_inputevent",select_overload<void(int,double,double,double)>(&TimeDependentParameter::update_inputevent))
		.property("initial",&TimeDependentParameter::initial_value);
}


// ---------------------------------------------------------------------------- //
// MODEL
// ---------------------------------------------------------------------------- //

EMSCRIPTEN_BINDINGS(model) {
	class_<Model>("Model")
		.constructor<>()

		//Vars
		.property("gamma",&Model::gamma)
		.property("xi",&Model::xi)
		.property("nu",&Model::nu)
		.property("lambda_r",&Model::lambda_r)
		.property("lambda_r_prime",&Model::lambda_r_prime)
		.property("lambda_s",&Model::lambda_s)
		.property("lambda_s_prime",&Model::lambda_s_prime)
		.property("eta",&Model::eta)
		.property("tau",&Model::tau)
		.property("N_test_max",&Model::N_test_max)
		.property("epsilon",&Model::epsilon)
		.property("rho",&Model::rho)
		.property("phi",&Model::phi)
		.property("R_0",&Model::R_0)
		.property("Phi_t",&Model::Phi)
		.property("k_t",&Model::k);

}

// ---------------------------------------------------------------------------- //
// Solver
// ---------------------------------------------------------------------------- //

EMSCRIPTEN_BINDINGS(solver) {
	class_<Solver>("Solver")
		.constructor<Model>()

		//Functions
		.function("get_data",&Solver::get_data)
		.function("run",select_overload<void(double, double, double, double, double, double, double, double)>(&Solver::run));

}