# covid19_metastability_website
Simulation [website](https://covid19-metastability.ds.mpg.de/) for our publication [**Low case numbers enable long-term stable pandemic control without lockdowns**](https://doi.org/10.1126/sciadv.abg2243).
The website uses webassembly for the simulations and the highcharts libary for plotting.
The model code, aswell as the dgl solver can be found in the `assets/cpp` folder.



Simply opening the html file with a browser does **not** work. You can run a local http server with e.g. python `python -m http.server`.
