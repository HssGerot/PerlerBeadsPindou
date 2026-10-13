cd dist
ossutil rm oss://perlerbead-i9527-xin/index.html
ossutil rm oss://perlerbead-i9527-xin/robots.txt
ossutil rm oss://perlerbead-i9527-xin/sitemap.xml
ossutil rm oss://perlerbead-i9527-xin/assets -rf
ossutil cp assets oss://perlerbead-i9527-xin/assets -r
ossutil cp index.html oss://perlerbead-i9527-xin
ossutil cp robots.txt oss://perlerbead-i9527-xin
ossutil cp sitemap.xml oss://perlerbead-i9527-xin
cd ..
