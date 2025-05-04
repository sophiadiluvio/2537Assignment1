globalThis.base_dir = __dir_name;
globalThis.abs_path = function(path) {
    return base_dir + path;
}
global.include = function(file){
    return require(abs_path('/' + file));
}

