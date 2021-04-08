CC = em++
CONF = -std=c++17 
LINK = -ltbb
INC = -I./src -I./scripts -I./
CFLAGS = -Wall -O2
CXXFLAGS = $(CONF) $(INC)  
CFLAGS = -Wall -O2
EXPORTED_FUNCTIONS = ""

all: communication.cpp src/model.cpp src/solver.cpp src/timeDependentParameter.cpp src/utils.cpp
	$(CC) communication.cpp src/model.cpp src/solver.cpp src/timeDependentParameter.cpp src/utils.cpp $(CFLAGS) -s WASM=1 -s LLD_REPORT_UNDEFINED -s EXPORTED_FUNCTIONS='[$(EXPORTED_FUNCTIONS)]' -o ../js/model.js --bind -s ASSERTIONS=1 -s ALLOW_MEMORY_GROWTH=1 

# Other
clean:
	rm ../js/model.wasm
	
new: clean all
	