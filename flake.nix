{
  description = "syndicate-rss";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/release-20.09";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          devShell = pkgs.mkShell {
            buildInputs = [ pkgs.nodejs-14_x pkgs.yarn pkgs.yarn2nix ];
          };
          defaultPackage = pkgs.mkYarnPackage
            {
              name = "syndicate-rss";
              src = ./.;
              packageJSON = ./package.json;
              yarnLock = ./yarn.lock;
              postBuild = ''
                ls -lha .
                yarn tsc
                (cd ./deps/syndicate-rss && yarn tsc)
                chmod a+x ./deps/syndicate-rss/dist/*
                chmod a+x ./deps/syndicate-rss/dist/*
                ls -lha ./deps/syndicate-rss/dist/
              '';
              # NOTE: this is optional and generated dynamically if omitted
              # yarnNix = ./yarn.nix;

            };
        }
      );
}
