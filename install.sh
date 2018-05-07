apt-get update -q && apt-get install -y \
    wget \
    git \
    curl \
    software-properties-common \
    python-software-properties

add-apt-repository "deb http://apt.postgresql.org/pub/repos/apt/ xenial-pgdg main"
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

apt-get update -q && apt-get install -y postgresql-9.6 postgresql-contrib-9.6

add-apt-repository -y ppa:ubuntugis/ubuntugis-unstable

apt-get update -q && apt-get install -y postgis postgresql-9.6-postgis-2.3

add-apt-repository -y ppa:ubuntu-toolchain-r/test

apt-get update -y
apt-get install -y gcc-6 g++-6 clang-3.8 python zlib1g-dev clang make pkg-config curl
export CXX="clang++-3.8" && export CC="clang-3.8"

git clone https://github.com/mapnik/mapnik mapnik-3.x --depth 10

cd mapnik-3.x
git submodule update --init
source bootstrap.sh
./configure CUSTOM_CXXFLAGS="-D_GLIBCXX_USE_CXX11_ABI=0" CXX=${CXX} CC=${CC}
make
make install

curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs build-essential libcairo2-dev libjpeg-dev libgif-dev

cd ../
apt-install -y npm
git clone https://github.com/mapnik/node-mapnik.git
cd node-mapnik
npm install

cd ../
npm install -g pm2
apt-get install nginx

vim /etc/nginx/sites-available/default
# location / {
#     proxy_pass http://localhost:8080;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
# }

# Change server_name

systemctl restart nginx

add-apt-repository ppa:certbot/certbot
apt-get update
apt-get install python-certbot-nginx
ufw allow 'Nginx Full'

# Request certificate
# certbot --nginx -d <domain name>

git clone https://github.com/axismaps/irio.git
cd irio
npm install
cd import
npm install -g

# Setting up database user
su postgres
createuser -s root
exit
createdb rio
psql -f init.sql -d rio
