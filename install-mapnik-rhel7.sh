# update
sudo yum -y update
sudo yum -y upgrade

# install epel repo
sudo yum -y install wget
wget https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
sudo rpm -Uvh epel-release-latest-7.noarch.rpm 

wget http://yum.postgresql.org/9.3/redhat/rhel-7-x86_64/pgdg-redhat93-9.3-1.noarch.rpm
sudo rpm -Uvh pgdg*.rpm

# update (again)
sudo yum -y update

# install deps
sudo yum -y install make gcc47 gcc-c++ bzip2-devel libpng-devel libtiff-devel zlib-devel libjpeg-devel libxml2-devel python-setuptools git-all python-nose python-devel python proj-devel proj proj-epsg proj-nad freetype-devel freetype libicu-devel libicu git bzip2 pango pango-devel pangomm

# install optional deps
sudo yum -y install gdal-devel gdal postgresql-devel sqlite-devel sqlite libcurl-devel libcurl cairo-devel cairo pycairo-devel pycairo postgresql93 postgresql93-server postgresql93-libs postgresql93-contrib postgresql93-devel postgis2_93 vim

JOBS=`grep -c ^processor /proc/cpuinfo`

# build recent boost
export BOOST_VERSION="1_55_0"
export S3_BASE="http://mapnik.s3.amazonaws.com/deps"
curl -O ${S3_BASE}/boost_${BOOST_VERSION}.tar.bz2
tar xf boost_${BOOST_VERSION}.tar.bz2
cd boost_${BOOST_VERSION}
./bootstrap.sh
./b2 -d1 -j${JOBS} \
    --with-thread \
    --with-filesystem \
    --with-python \
    --with-regex -sHAVE_ICU=1  \
    --with-program_options \
    --with-system \
    link=shared \
    release \
    toolset=gcc \
    stage
sudo ./b2 -j${JOBS} \
    --with-thread \
    --with-filesystem \
    --with-python \
    --with-regex -sHAVE_ICU=1 \
    --with-program_options \
    --with-system \
    toolset=gcc \
    link=shared \
    release \
    install
cd ../

# set up support for libraries installed in /usr/local/lib
sudo bash -c "echo '/usr/local/lib' > /etc/ld.so.conf.d/boost.conf"
sudo ldconfig

# mapnik
# stable branch: 2.3.x
git clone https://github.com/mapnik/mapnik -b 2.3.x
cd mapnik
./configure
make
make test
sudo make install
cd ../

# node
NODE_VERSION="0.10.26"
wget http://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.tar.gz
tar xf node-v${NODE_VERSION}.tar.gz
cd node-v${NODE_VERSION}
./configure
make -j${JOBS}
sudo make install
cd ../

# install protobuf libs needed by node-mapnik
sudo yum -y install protobuf-devel protobuf-lite

# Then workaround package bugs:
# 1) 'pkg-config protobuf --libs-only-L' misses -L/usr/lib64
# do this to fix:
export LDFLAGS="-L/usr/lib64"
# 2) '/usr/lib64/libprotobuf-lite.so' symlink is missing
# do this to fix:
sudo ln -s /usr/lib64/libprotobuf-lite.so.8 /usr/lib64/libprotobuf-lite.so
# otherwise you will hit: '/usr/bin/ld: cannot find -lprotobuf-lite' building node-mapnik

# node-mapnik
git clone https://github.com/mapnik/node-mapnik
cd node-mapnik
npm install
npm test
cd ../

# postgis
# sudo /usr/pgsql-9.3/bin/postgresql93-setup initdb
# sudo service postgresql-9.3 start

# install giflib dep for node-canvas
wget ftp://fr2.rpmfind.net/linux/centos/7.2.1511/os/x86_64/Packages/giflib-devel-4.1.6-9.el7.x86_64.rpm
sudo rpm -Uvh giflib-devel-4.1.6-9.el7.x86_64.rpm

# install pm2 monitoring
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
npm install -g pm2

# installing google fonts
sudo yum -y install dejavu-*
echo "Downloading the fonts..."
mkdir -p ~/Documents/
cd ~/Documents/
curl -L https://github.com/google/fonts/tarball/master -o master.tar.gz
echo "Extracting the fonts..."
mkdir -p goog-fonts/fonts
tar -zxf master.tar.gz -C goog-fonts/fonts
cd goog-fonts
cd fonts
find . -mindepth 2 -type f -print -exec mv {} . \;
rm -R -- */
rm *.txt
rm *.json
rm *.csv
rm *.md
rm *.html
rm *.py
rm AUTHORS
rm CONTRIBUTORS
cd ..
sudo mv fonts/* /usr/share/fonts/

echo "Fonts installed, cleaning up files.."
cd ~/Documents/
rm -f master.tar.gz
rm -rf goog-fonts

echo "Updating font cache..."
fc-cache -f

echo "All done! All Google Fonts installed."