#include "communication.h"

val data_struct::get_time(){
	double* a= &time[0];
	return val(typed_memory_view(time.size(),a));
};

val data_struct::get_S(){
	double* a= &S[0];
	return val(typed_memory_view(S.size(),a));
};
val data_struct::get_E_Q(){
	double* a= &E_Q[0];
	return val(typed_memory_view(E_Q.size(),a));
};
val data_struct::get_E_H(){
	double* a= &E_H[0];
	return val(typed_memory_view(E_H.size(),a));
};
val data_struct::get_I_Q(){
	double* a= &I_Q[0];
	return val(typed_memory_view(I_Q.size(),a));
};
val data_struct::get_I_H(){
	double* a= &I_H[0];
	return val(typed_memory_view(I_H.size(),a));
};
val data_struct::get_I_Hs(){
	double* a= &I_Hs[0];
	return val(typed_memory_view(I_Hs.size(),a));
};
val data_struct::get_R(){
	double* a= &R[0];
	return val(typed_memory_view(R.size(),a));
};
val data_struct::get_N(){
	double* a= &N[0];
	return val(typed_memory_view(N.size(),a));
};
val data_struct::get_N_obs(){
	double* a= &N_obs[0];
	return val(typed_memory_view(N_obs.size(),a));
};
