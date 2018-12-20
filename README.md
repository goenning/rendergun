# How to use it

Start a new container with

$ docker run --name rendergun -p 3000:3000 goenning/rendergun

On your browser, navigate to `http://localhost:3000/render?url=https://example.org`

🎉

# Load Testing

Install https://github.com/tsenart/vegeta

$ echo "GET http://localhost:3000/render?url=http://example.org" | vegeta attack -duration=5s | tee results.bin | vegeta report

# To do

- Better Documentation